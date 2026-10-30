create table public.player_wallets (
  player_id uuid primary key references auth.users (id) on delete cascade,
  balance bigint not null default 1000 check (balance between 0 and 9007199254740991),
  balance_version bigint not null default 0 check (balance_version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guest_sessions (
  id uuid primary key,
  balance bigint not null default 1000 check (balance between 0 and 9007199254740991),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null,
  player_id uuid references auth.users (id) on delete cascade,
  guest_session_id uuid references public.guest_sessions (id) on delete cascade,
  game text not null check (game in ('slots', 'roulette', 'prize-wheel')),
  wager bigint not null check (wager > 0),
  payout bigint not null check (payout >= 0),
  net_profit bigint not null,
  balance_after bigint not null check (balance_after >= 0),
  balance_version bigint not null check (balance_version >= 0),
  result jsonb not null,
  created_at timestamptz not null default now(),
  constraint game_rounds_one_owner check (num_nonnulls(player_id, guest_session_id) = 1)
);

create unique index game_rounds_player_operation_unique
  on public.game_rounds (player_id, operation_id)
  where player_id is not null;
create unique index game_rounds_guest_operation_unique
  on public.game_rounds (guest_session_id, operation_id)
  where guest_session_id is not null;

create table public.game_sessions (
  id uuid primary key,
  start_operation_id uuid not null,
  player_id uuid references auth.users (id) on delete cascade,
  guest_session_id uuid references public.guest_sessions (id) on delete cascade,
  wager bigint not null check (wager in (10, 50, 100)),
  state jsonb not null,
  public_state jsonb not null,
  status text not null check (status in ('active', 'complete')),
  version integer not null default 0 check (version >= 0),
  last_operation_id uuid not null,
  last_response jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_sessions_one_owner check (num_nonnulls(player_id, guest_session_id) = 1)
);

create unique index game_sessions_player_start_operation_unique
  on public.game_sessions (player_id, start_operation_id)
  where player_id is not null;
create unique index game_sessions_guest_start_operation_unique
  on public.game_sessions (guest_session_id, start_operation_id)
  where guest_session_id is not null;
create unique index game_sessions_one_active_player
  on public.game_sessions (player_id)
  where player_id is not null and status = 'active';
create unique index game_sessions_one_active_guest
  on public.game_sessions (guest_session_id)
  where guest_session_id is not null and status = 'active';

create table public.leaderboard_outbox (
  event_id uuid primary key,
  player_id uuid not null references auth.users (id) on delete cascade,
  balance bigint not null check (balance >= 0),
  balance_version bigint not null check (balance_version >= 0),
  win_amount bigint not null check (win_amount >= 0),
  occurred_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  processed_at timestamptz,
  last_error text
);

alter table public.player_wallets enable row level security;
alter table public.guest_sessions enable row level security;
alter table public.game_rounds enable row level security;
alter table public.game_sessions enable row level security;
alter table public.leaderboard_outbox enable row level security;

revoke all on public.player_wallets, public.guest_sessions, public.game_rounds,
  public.game_sessions, public.leaderboard_outbox from anon, authenticated;
grant all on public.player_wallets, public.guest_sessions, public.game_rounds,
  public.game_sessions, public.leaderboard_outbox to service_role;

create function public.apply_game_round(
  p_user_id uuid,
  p_guest_session_id uuid,
  p_operation_id uuid,
  p_game text,
  p_wager bigint,
  p_payout bigint,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_balance bigint;
  current_version bigint;
  resulting_balance bigint;
  resulting_version bigint;
  round_id uuid;
  existing_round public.game_rounds%rowtype;
begin
  if num_nonnulls(p_user_id, p_guest_session_id) <> 1
    or p_operation_id is null
    or p_game is null
    or p_game not in ('slots', 'roulette', 'prize-wheel')
    or p_wager is null
    or p_wager <= 0
    or p_payout is null
    or p_payout < 0
    or p_payout > 9007199254740991
    or p_result is null
  then
    raise exception using errcode = '22023', message = 'Invalid game round';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_operation_id::text));

  if p_user_id is not null then
    select * into existing_round from public.game_rounds
      where player_id = p_user_id and operation_id = p_operation_id;
  else
    select * into existing_round from public.game_rounds
      where guest_session_id = p_guest_session_id and operation_id = p_operation_id;
  end if;
  if found then
    return pg_catalog.jsonb_build_object(
      'balance', existing_round.balance_after,
      'balanceVersion', existing_round.balance_version,
      'result', existing_round.result,
      'netProfit', existing_round.net_profit,
      'replayed', true
    );
  end if;

  if p_user_id is not null then
    insert into public.player_wallets (player_id) values (p_user_id)
      on conflict (player_id) do nothing;
    select balance, balance_version into current_balance, current_version
      from public.player_wallets where player_id = p_user_id for update;
  else
    select balance, 0 into current_balance, current_version
      from public.guest_sessions
      where id = p_guest_session_id and expires_at > pg_catalog.now()
      for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'Guest session expired';
    end if;
  end if;

  if current_balance < p_wager then
    raise exception using errcode = 'P0001', message = 'Insufficient credits';
  end if;
  resulting_balance := current_balance - p_wager + p_payout;
  if resulting_balance > 9007199254740991 then
    raise exception using errcode = '22003', message = 'Balance exceeds supported range';
  end if;
  resulting_version := current_version + 1;

  if p_user_id is not null then
    update public.player_wallets
      set balance = resulting_balance,
          balance_version = resulting_version,
          updated_at = pg_catalog.now()
      where player_id = p_user_id;
  else
    update public.guest_sessions set balance = resulting_balance
      where id = p_guest_session_id;
  end if;

  round_id := pg_catalog.gen_random_uuid();
  insert into public.game_rounds (
    id, operation_id, player_id, guest_session_id, game, wager, payout,
    net_profit, balance_after, balance_version, result
  ) values (
    round_id, p_operation_id, p_user_id, p_guest_session_id, p_game, p_wager, p_payout,
    p_payout - p_wager, resulting_balance, resulting_version, p_result
  );

  if p_user_id is not null then
    insert into public.leaderboard_outbox (
      event_id, player_id, balance, balance_version, win_amount
    ) values (
      round_id, p_user_id, resulting_balance, resulting_version,
      greatest(p_payout - p_wager, 0)
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'balance', resulting_balance,
    'balanceVersion', resulting_version,
    'result', p_result,
    'netProfit', p_payout - p_wager,
    'replayed', false
  );
end;
$$;

create function public.start_blackjack_round(
  p_user_id uuid,
  p_guest_session_id uuid,
  p_game_id uuid,
  p_operation_id uuid,
  p_wager bigint,
  p_state jsonb,
  p_public_state jsonb,
  p_payout bigint,
  p_complete boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_balance bigint;
  current_version bigint;
  resulting_balance bigint;
  resulting_version bigint;
  response jsonb;
  existing_session public.game_sessions%rowtype;
begin
  if num_nonnulls(p_user_id, p_guest_session_id) <> 1
    or p_game_id is null or p_operation_id is null
    or p_wager is null or p_complete is null or p_payout is null
    or p_wager not in (10, 50, 100)
    or p_payout < 0 or p_payout > p_wager * 3
    or p_state is null or p_public_state is null
  then
    raise exception using errcode = '22023', message = 'Invalid blackjack round';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_operation_id::text));

  if p_user_id is not null then
    select * into existing_session from public.game_sessions
      where player_id = p_user_id and start_operation_id = p_operation_id;
  else
    select * into existing_session from public.game_sessions
      where guest_session_id = p_guest_session_id and start_operation_id = p_operation_id;
  end if;
  if found then
    return existing_session.last_response;
  end if;

  if p_user_id is not null then
    insert into public.player_wallets (player_id) values (p_user_id)
      on conflict (player_id) do nothing;
    select balance, balance_version into current_balance, current_version
      from public.player_wallets where player_id = p_user_id for update;
  else
    select balance, 0 into current_balance, current_version
      from public.guest_sessions
      where id = p_guest_session_id and expires_at > pg_catalog.now()
      for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'Guest session expired';
    end if;
  end if;
  if current_balance < p_wager then
    raise exception using errcode = 'P0001', message = 'Insufficient credits';
  end if;

  resulting_balance := current_balance - p_wager + case when p_complete then p_payout else 0 end;
  resulting_version := current_version + 1;
  if p_user_id is not null then
    update public.player_wallets
      set balance = resulting_balance,
          balance_version = resulting_version,
          updated_at = pg_catalog.now()
      where player_id = p_user_id;
  else
    update public.guest_sessions set balance = resulting_balance where id = p_guest_session_id;
  end if;

  response := pg_catalog.jsonb_build_object(
    'gameId', p_game_id,
    'balance', resulting_balance,
    'balanceVersion', resulting_version,
    'version', 0,
    'complete', p_complete,
    'result', p_public_state
  );
  insert into public.game_sessions (
    id, start_operation_id, player_id, guest_session_id, wager, state, public_state,
    status, last_operation_id, last_response, result
  ) values (
    p_game_id, p_operation_id, p_user_id, p_guest_session_id, p_wager, p_state, p_public_state,
    case when p_complete then 'complete' else 'active' end, p_operation_id, response,
    case when p_complete then p_public_state else null end
  );

  if p_user_id is not null then
    insert into public.leaderboard_outbox (
      event_id, player_id, balance, balance_version, win_amount
    ) values (
      p_operation_id, p_user_id, resulting_balance, resulting_version,
      case when p_complete then greatest(p_payout - p_wager, 0) else 0 end
    );
  end if;
  return response;
end;
$$;

create function public.advance_blackjack_round(
  p_user_id uuid,
  p_guest_session_id uuid,
  p_game_id uuid,
  p_expected_version integer,
  p_operation_id uuid,
  p_state jsonb,
  p_public_state jsonb,
  p_payout bigint,
  p_complete boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session public.game_sessions%rowtype;
  current_balance bigint;
  current_version bigint;
  response jsonb;
begin
  if num_nonnulls(p_user_id, p_guest_session_id) <> 1
    or p_game_id is null or p_operation_id is null
    or p_expected_version is null or p_expected_version < 0
    or p_payout is null or p_payout < 0 or p_complete is null
    or p_state is null or p_public_state is null
  then
    raise exception using errcode = '22023', message = 'Invalid blackjack action';
  end if;

  select * into current_session from public.game_sessions
    where id = p_game_id
      and ((p_user_id is not null and player_id = p_user_id)
        or (p_guest_session_id is not null and guest_session_id = p_guest_session_id))
    for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Blackjack round not found';
  end if;
  if current_session.last_operation_id = p_operation_id then
    return current_session.last_response;
  end if;
  if current_session.status <> 'active' or current_session.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Blackjack round changed; reload the game';
  end if;

  response := pg_catalog.jsonb_build_object(
    'gameId', p_game_id,
    'balance', null,
    'balanceVersion', null,
    'version', current_session.version + 1,
    'complete', p_complete,
    'result', p_public_state
  );
  if p_complete then
    if p_user_id is not null then
      select balance, balance_version into current_balance, current_version
        from public.player_wallets where player_id = p_user_id for update;
      current_balance := current_balance + p_payout;
      current_version := current_version + 1;
      update public.player_wallets
        set balance = current_balance, balance_version = current_version, updated_at = pg_catalog.now()
        where player_id = p_user_id;
    else
      update public.guest_sessions
        set balance = balance + p_payout
        where id = p_guest_session_id and expires_at > pg_catalog.now()
        returning balance into current_balance;
      if not found then
        raise exception using errcode = 'P0001', message = 'Guest session expired';
      end if;
      current_version := 0;
    end if;
    response := response || pg_catalog.jsonb_build_object(
      'balance', current_balance,
      'balanceVersion', current_version
    );
    if p_user_id is not null then
      insert into public.leaderboard_outbox (
        event_id, player_id, balance, balance_version, win_amount
      ) values (
        pg_catalog.gen_random_uuid(), p_user_id, current_balance, current_version,
        greatest(p_payout - current_session.wager, 0)
      );
    end if;
  end if;

  update public.game_sessions
    set state = p_state,
        public_state = p_public_state,
        status = case when p_complete then 'complete' else 'active' end,
        version = version + 1,
        last_operation_id = p_operation_id,
        last_response = response,
        result = case when p_complete then p_public_state else result end,
        updated_at = pg_catalog.now()
    where id = p_game_id;
  return response;
end;
$$;

create function public.claim_leaderboard_outbox(p_limit integer default 50)
returns table (
  event_id uuid,
  player_id uuid,
  balance bigint,
  balance_version bigint,
  win_amount bigint,
  occurred_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    with candidates as (
      select outbox.event_id
      from public.leaderboard_outbox as outbox
      where outbox.processed_at is null
        and outbox.next_attempt_at <= pg_catalog.now()
        and (outbox.locked_until is null or outbox.locked_until <= pg_catalog.now())
      order by outbox.occurred_at
      limit least(greatest(p_limit, 1), 100)
      for update skip locked
    )
    update public.leaderboard_outbox as outbox
      set locked_until = pg_catalog.now() + interval '1 minute'
      from candidates
      where outbox.event_id = candidates.event_id
      returning outbox.event_id, outbox.player_id, outbox.balance,
        outbox.balance_version, outbox.win_amount, outbox.occurred_at;
end;
$$;

create function public.ack_leaderboard_outbox(p_event_id uuid, p_success boolean, p_error text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_success then
    update public.leaderboard_outbox
      set processed_at = pg_catalog.now(), locked_until = null, last_error = null
      where event_id = p_event_id and processed_at is null;
  else
    update public.leaderboard_outbox
      set attempts = attempts + 1,
          next_attempt_at = pg_catalog.now() + least(
            interval '5 minutes',
            interval '1 second' * pg_catalog.power(2, least(attempts, 8))
          ),
          locked_until = null,
          last_error = pg_catalog.left(coalesce(p_error, 'Delivery failed'), 500)
      where event_id = p_event_id and processed_at is null;
  end if;
end;
$$;

revoke all on function public.apply_game_round(uuid, uuid, uuid, text, bigint, bigint, jsonb) from public, anon, authenticated;
revoke all on function public.start_blackjack_round(uuid, uuid, uuid, uuid, bigint, jsonb, jsonb, bigint, boolean) from public, anon, authenticated;
revoke all on function public.advance_blackjack_round(uuid, uuid, uuid, integer, uuid, jsonb, jsonb, bigint, boolean) from public, anon, authenticated;
revoke all on function public.claim_leaderboard_outbox(integer) from public, anon, authenticated;
revoke all on function public.ack_leaderboard_outbox(uuid, boolean, text) from public, anon, authenticated;

grant execute on function public.apply_game_round(uuid, uuid, uuid, text, bigint, bigint, jsonb) to service_role;
grant execute on function public.start_blackjack_round(uuid, uuid, uuid, uuid, bigint, jsonb, jsonb, bigint, boolean) to service_role;
grant execute on function public.advance_blackjack_round(uuid, uuid, uuid, integer, uuid, jsonb, jsonb, bigint, boolean) to service_role;
grant execute on function public.claim_leaderboard_outbox(integer) to service_role;
grant execute on function public.ack_leaderboard_outbox(uuid, boolean, text) to service_role;
