alter table public.game_rounds
  drop constraint game_rounds_game_check,
  add constraint game_rounds_game_check
    check (game in ('slots', 'alchemists-crucible', 'roulette', 'prize-wheel')),
  drop constraint game_rounds_wager_check,
  add constraint game_rounds_wager_check
    check (wager >= 0 and (wager > 0 or game = 'alchemists-crucible'));

create table public.alchemists_crucible_bonus_sessions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  player_id uuid references auth.users (id) on delete cascade,
  guest_session_id uuid references public.guest_sessions (id) on delete cascade,
  bet bigint not null check (bet in (20, 40, 100, 200, 500, 1000)),
  spins_remaining integer not null check (spins_remaining >= 0),
  total_spins integer not null check (total_spins >= 10),
  sticky_wilds jsonb not null default '{}'::jsonb,
  accumulated_win bigint not null default 0 check (accumulated_win >= 0),
  version integer not null default 0 check (version >= 0),
  status text not null check (status in ('active', 'complete')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint alchemists_crucible_bonus_one_owner
    check (num_nonnulls(player_id, guest_session_id) = 1)
);

create unique index alchemists_crucible_bonus_one_active_player
  on public.alchemists_crucible_bonus_sessions (player_id)
  where player_id is not null and status = 'active';
create unique index alchemists_crucible_bonus_one_active_guest
  on public.alchemists_crucible_bonus_sessions (guest_session_id)
  where guest_session_id is not null and status = 'active';

alter table public.alchemists_crucible_bonus_sessions enable row level security;
revoke all on public.alchemists_crucible_bonus_sessions from anon, authenticated;
grant all on public.alchemists_crucible_bonus_sessions to service_role;

create function public.apply_alchemists_crucible_round(
  p_user_id uuid,
  p_guest_session_id uuid,
  p_operation_id uuid,
  p_wager bigint,
  p_payout bigint,
  p_result jsonb,
  p_bonus_id uuid default null,
  p_bonus_version integer default null,
  p_sticky_wilds jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_round public.game_rounds%rowtype;
  bonus_session public.alchemists_crucible_bonus_sessions%rowtype;
  round_response jsonb;
  response_result jsonb;
  bonus_state jsonb;
  current_balance bigint;
  current_version bigint;
  resulting_balance bigint;
  resulting_version bigint;
  next_spins integer;
  round_id uuid;
begin
  if num_nonnulls(p_user_id, p_guest_session_id) <> 1
    or p_operation_id is null
    or p_wager is null
    or p_wager not in (0, 20, 40, 100, 200, 500, 1000)
    or p_payout is null
    or p_payout < 0
    or p_payout > 9007199254740991
    or p_result is null
    or (p_result ->> 'totalWin')::bigint is distinct from p_payout
  then
    raise exception using errcode = '22023', message = 'Invalid Alchemist''s Crucible round';
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
    if existing_round.game <> 'alchemists-crucible' then
      raise exception using errcode = '22023', message = 'Operation ID belongs to another game';
    end if;
    return pg_catalog.jsonb_build_object(
      'balance', existing_round.balance_after,
      'balanceVersion', existing_round.balance_version,
      'result', existing_round.result,
      'netProfit', existing_round.net_profit,
      'replayed', true
    );
  end if;

  if p_wager > 0 then
    if p_bonus_id is not null
      or p_result ->> 'isBonusSpin' is distinct from 'false'
    then
      raise exception using errcode = '22023', message = 'Invalid paid Crucible spin';
    end if;

    if p_user_id is not null then
      perform 1 from public.alchemists_crucible_bonus_sessions
        where player_id = p_user_id and status = 'active';
    else
      perform 1 from public.alchemists_crucible_bonus_sessions
        where guest_session_id = p_guest_session_id and status = 'active';
    end if;
    if found then
      raise exception using errcode = 'P0001', message = 'Finish your active Crucible free spins first';
    end if;

    round_response := public.apply_game_round(
      p_user_id, p_guest_session_id, p_operation_id, 'slots',
      p_wager, p_payout, p_result
    );
    if p_user_id is not null then
      update public.game_rounds set game = 'alchemists-crucible'
        where player_id = p_user_id and operation_id = p_operation_id;
    else
      update public.game_rounds set game = 'alchemists-crucible'
        where guest_session_id = p_guest_session_id and operation_id = p_operation_id;
    end if;

    if p_result ->> 'isFreeSpinsTriggered' = 'true' then
      insert into public.alchemists_crucible_bonus_sessions (
        player_id, guest_session_id, bet, spins_remaining, total_spins,
        sticky_wilds, accumulated_win, status
      ) values (
        p_user_id, p_guest_session_id, p_wager, 10, 10, '{}'::jsonb, 0, 'active'
      )
      returning * into bonus_session;
      bonus_state := pg_catalog.jsonb_build_object(
        'id', bonus_session.id,
        'version', bonus_session.version,
        'bet', bonus_session.bet,
        'spinsRemaining', bonus_session.spins_remaining,
        'totalSpins', bonus_session.total_spins,
        'stickyWilds', bonus_session.sticky_wilds,
        'accumulatedWin', bonus_session.accumulated_win,
        'status', bonus_session.status
      );
      response_result := p_result || pg_catalog.jsonb_build_object('bonusState', bonus_state);
      if p_user_id is not null then
        update public.game_rounds set result = response_result
          where player_id = p_user_id and operation_id = p_operation_id;
      else
        update public.game_rounds set result = response_result
          where guest_session_id = p_guest_session_id and operation_id = p_operation_id;
      end if;
      round_response := round_response || pg_catalog.jsonb_build_object('result', response_result);
    end if;
    return round_response;
  end if;

  if p_bonus_id is null
    or p_bonus_version is null
    or p_sticky_wilds is null
    or jsonb_typeof(p_sticky_wilds) <> 'object'
    or p_result ->> 'isBonusSpin' is distinct from 'true'
  then
    raise exception using errcode = '22023', message = 'Invalid Crucible free spin';
  end if;

  if p_user_id is not null then
    select * into bonus_session from public.alchemists_crucible_bonus_sessions
      where id = p_bonus_id and player_id = p_user_id and status = 'active'
      for update;
  else
    select * into bonus_session from public.alchemists_crucible_bonus_sessions
      where id = p_bonus_id and guest_session_id = p_guest_session_id and status = 'active'
      for update;
  end if;
  if not found or bonus_session.version <> p_bonus_version then
    raise exception using errcode = '40001', message = 'Crucible free spins changed; retry this spin';
  end if;

  if p_user_id is not null then
    select balance, balance_version into current_balance, current_version
      from public.player_wallets where player_id = p_user_id for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'Player wallet not found';
    end if;
    resulting_balance := current_balance + p_payout;
    resulting_version := current_version + 1;
    if resulting_balance > 9007199254740991 then
      raise exception using errcode = '22003', message = 'Balance exceeds supported range';
    end if;
    update public.player_wallets
      set balance = resulting_balance,
          balance_version = resulting_version,
          updated_at = pg_catalog.now()
      where player_id = p_user_id;
  else
    select balance into current_balance
      from public.guest_sessions
      where id = p_guest_session_id and expires_at > pg_catalog.now()
      for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'Guest session expired';
    end if;
    resulting_balance := current_balance + p_payout;
    resulting_version := 0;
    if resulting_balance > 9007199254740991 then
      raise exception using errcode = '22003', message = 'Balance exceeds supported range';
    end if;
    update public.guest_sessions set balance = resulting_balance
      where id = p_guest_session_id;
  end if;

  next_spins := bonus_session.spins_remaining - 1
    + case when p_result ->> 'isRetrigger' = 'true' then 5 else 0 end;
  update public.alchemists_crucible_bonus_sessions
    set spins_remaining = next_spins,
        total_spins = total_spins + case when p_result ->> 'isRetrigger' = 'true' then 5 else 0 end,
        sticky_wilds = p_sticky_wilds,
        accumulated_win = accumulated_win + p_payout,
        version = version + 1,
        status = case when next_spins = 0 then 'complete' else 'active' end,
        updated_at = pg_catalog.now()
    where id = bonus_session.id
    returning * into bonus_session;

  bonus_state := pg_catalog.jsonb_build_object(
    'id', bonus_session.id,
    'version', bonus_session.version,
    'bet', bonus_session.bet,
    'spinsRemaining', bonus_session.spins_remaining,
    'totalSpins', bonus_session.total_spins,
    'stickyWilds', bonus_session.sticky_wilds,
    'accumulatedWin', bonus_session.accumulated_win,
    'status', bonus_session.status
  );
  response_result := p_result || pg_catalog.jsonb_build_object('bonusState', bonus_state);
  round_id := pg_catalog.gen_random_uuid();
  insert into public.game_rounds (
    id, operation_id, player_id, guest_session_id, game, wager, payout,
    net_profit, balance_after, balance_version, result
  ) values (
    round_id, p_operation_id, p_user_id, p_guest_session_id,
    'alchemists-crucible', 0, p_payout, p_payout,
    resulting_balance, resulting_version, response_result
  );

  if p_user_id is not null then
    insert into public.leaderboard_outbox (
      event_id, player_id, balance, balance_version, win_amount
    ) values (
      round_id, p_user_id, resulting_balance, resulting_version, p_payout
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'balance', resulting_balance,
    'balanceVersion', resulting_version,
    'result', response_result,
    'netProfit', p_payout,
    'replayed', false
  );
end;
$$;

revoke all on function public.apply_alchemists_crucible_round(
  uuid, uuid, uuid, bigint, bigint, jsonb, uuid, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_alchemists_crucible_round(
  uuid, uuid, uuid, bigint, bigint, jsonb, uuid, integer, jsonb
) to service_role;
