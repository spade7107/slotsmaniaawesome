create table public.player_daily_bonus_claims (
  player_id uuid not null references auth.users (id) on delete cascade,
  claim_date date not null,
  reward bigint not null check (reward = 100),
  claimed_at timestamptz not null default pg_catalog.now(),
  primary key (player_id, claim_date)
);

create table public.player_daily_quest_claims (
  player_id uuid not null references auth.users (id) on delete cascade,
  quest_date date not null,
  quest_id text not null check (quest_id in ('rounds-3', 'rounds-5')),
  reward bigint not null check (
    (quest_id = 'rounds-3' and reward = 50)
    or (quest_id = 'rounds-5' and reward = 100)
  ),
  claimed_at timestamptz not null default pg_catalog.now(),
  primary key (player_id, quest_date, quest_id)
);

create index game_rounds_player_created_at
  on public.game_rounds (player_id, created_at desc)
  where player_id is not null;
create index game_sessions_player_completed_at
  on public.game_sessions (player_id, updated_at desc)
  where player_id is not null and status = 'complete';
create index game_rounds_game_created_at
  on public.game_rounds (game, created_at desc);

alter table public.player_daily_bonus_claims enable row level security;
alter table public.player_daily_quest_claims enable row level security;
revoke all on public.player_daily_bonus_claims, public.player_daily_quest_claims
  from anon, authenticated;
grant all on public.player_daily_bonus_claims, public.player_daily_quest_claims
  to service_role;

create function public.get_dashboard_summary(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_total_rounds bigint;
  v_total_wager bigint;
  v_total_net_profit bigint;
  v_total_xp bigint;
  v_remaining_xp bigint;
  v_level integer := 1;
  v_today date := (pg_catalog.now() at time zone 'UTC')::date;
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_today_rounds bigint;
  v_bonus_available boolean;
  v_three_claimed boolean;
  v_five_claimed boolean;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'Player ID is required';
  end if;

  select username into v_username
    from public.profiles
    where id = p_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'Player profile not found';
  end if;

  v_today_start := v_today::timestamp at time zone 'UTC';
  v_today_end := (v_today + 1)::timestamp at time zone 'UTC';

  with completed_rounds as (
    select wager, net_profit, created_at as completed_at
      from public.game_rounds
      where player_id = p_user_id
    union all
    select wager,
      coalesce((result ->> 'payout')::bigint, 0) - wager as net_profit,
      updated_at as completed_at
      from public.game_sessions
      where player_id = p_user_id and status = 'complete' and result is not null
  )
  select
    count(*),
    coalesce(sum(wager), 0),
    coalesce(sum(net_profit), 0),
    coalesce(sum(least(pg_catalog.ceil(wager::numeric / 10), 100)), 0)::bigint
    into v_total_rounds, v_total_wager, v_total_net_profit, v_total_xp
    from completed_rounds;

  v_remaining_xp := v_total_xp;
  while v_remaining_xp >= v_level::bigint * 100 loop
    v_remaining_xp := v_remaining_xp - v_level::bigint * 100;
    v_level := v_level + 1;
  end loop;

  with completed_rounds as (
    select created_at as completed_at
      from public.game_rounds
      where player_id = p_user_id
    union all
    select updated_at as completed_at
      from public.game_sessions
      where player_id = p_user_id and status = 'complete'
  )
  select count(*) into v_today_rounds
    from completed_rounds
    where completed_at >= v_today_start and completed_at < v_today_end;

  select not exists (
    select 1 from public.player_daily_bonus_claims
    where player_id = p_user_id and claim_date = v_today
  ) into v_bonus_available;
  select exists (
    select 1 from public.player_daily_quest_claims
    where player_id = p_user_id and quest_date = v_today and quest_id = 'rounds-3'
  ) into v_three_claimed;
  select exists (
    select 1 from public.player_daily_quest_claims
    where player_id = p_user_id and quest_date = v_today and quest_id = 'rounds-5'
  ) into v_five_claimed;

  return pg_catalog.jsonb_build_object(
    'profile', pg_catalog.jsonb_build_object('username', v_username),
    'stats', pg_catalog.jsonb_build_object(
      'completedRounds', v_total_rounds,
      'totalWager', v_total_wager,
      'netProfit', v_total_net_profit
    ),
    'progression', pg_catalog.jsonb_build_object(
      'xp', v_total_xp,
      'level', v_level,
      'xpIntoLevel', v_remaining_xp,
      'xpForNextLevel', v_level::bigint * 100
    ),
    'dailyBonus', pg_catalog.jsonb_build_object(
      'available', v_bonus_available,
      'reward', 100,
      'resetsAt', v_today_end
    ),
    'quests', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'id', 'rounds-3',
        'title', 'Warm-up',
        'description', 'Complete 3 game rounds today',
        'progress', least(v_today_rounds, 3),
        'target', 3,
        'reward', 50,
        'claimed', v_three_claimed,
        'claimable', v_today_rounds >= 3 and not v_three_claimed
      ),
      pg_catalog.jsonb_build_object(
        'id', 'rounds-5',
        'title', 'On a roll',
        'description', 'Complete 5 game rounds today',
        'progress', least(v_today_rounds, 5),
        'target', 5,
        'reward', 100,
        'claimed', v_five_claimed,
        'claimable', v_today_rounds >= 5 and not v_five_claimed
      )
    )
  );
end;
$$;

create function public.get_popular_game_counts()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with game_activity as (
    select game from public.game_rounds
    union all
    select 'blackjack'::text from public.game_sessions where status = 'complete'
  ),
  game_counts as (
    select game, count(*) as completed_rounds
      from game_activity
      group by game
  )
  select coalesce(
    pg_catalog.jsonb_object_agg(game, completed_rounds),
    '{}'::jsonb
  )
  from game_counts;
$$;

create function public.claim_daily_bonus(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (pg_catalog.now() at time zone 'UTC')::date;
  v_balance bigint;
  v_balance_version bigint;
  v_claimed_at timestamptz;
  v_reward constant bigint := 100;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'Player ID is required';
  end if;

  select balance, balance_version into v_balance, v_balance_version
    from public.player_wallets
    where player_id = p_user_id
    for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Player wallet not found';
  end if;

  insert into public.player_daily_bonus_claims (player_id, claim_date, reward)
    values (p_user_id, v_today, v_reward)
    on conflict do nothing
    returning claimed_at into v_claimed_at;
  if not found then
    raise exception using errcode = 'P0001', message = 'Daily bonus already claimed';
  end if;

  if v_balance > 9007199254740991 - v_reward then
    raise exception using errcode = '22003', message = 'Balance exceeds supported range';
  end if;
  v_balance := v_balance + v_reward;
  v_balance_version := v_balance_version + 1;
  update public.player_wallets
    set balance = v_balance,
        balance_version = v_balance_version,
        updated_at = pg_catalog.now()
    where player_id = p_user_id;
  insert into public.leaderboard_outbox (
    event_id, player_id, balance, balance_version, win_amount
  ) values (
    pg_catalog.gen_random_uuid(), p_user_id, v_balance, v_balance_version, 0
  );

  return pg_catalog.jsonb_build_object(
    'balance', v_balance,
    'balanceVersion', v_balance_version,
    'reward', v_reward,
    'claimedAt', v_claimed_at
  );
end;
$$;

create function public.claim_daily_quest(p_user_id uuid, p_quest_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (pg_catalog.now() at time zone 'UTC')::date;
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_target bigint;
  v_reward bigint;
  v_progress bigint;
  v_balance bigint;
  v_balance_version bigint;
  v_claimed_at timestamptz;
begin
  if p_user_id is null or p_quest_id not in ('rounds-3', 'rounds-5') then
    raise exception using errcode = '22023', message = 'Invalid daily quest';
  end if;

  v_target := case p_quest_id when 'rounds-3' then 3 else 5 end;
  v_reward := case p_quest_id when 'rounds-3' then 50 else 100 end;
  v_today_start := v_today::timestamp at time zone 'UTC';
  v_today_end := (v_today + 1)::timestamp at time zone 'UTC';

  select balance, balance_version into v_balance, v_balance_version
    from public.player_wallets
    where player_id = p_user_id
    for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Player wallet not found';
  end if;

  with completed_rounds as (
    select created_at as completed_at
      from public.game_rounds
      where player_id = p_user_id
    union all
    select updated_at as completed_at
      from public.game_sessions
      where player_id = p_user_id and status = 'complete'
  )
  select count(*) into v_progress
    from completed_rounds
    where completed_at >= v_today_start and completed_at < v_today_end;
  if v_progress < v_target then
    raise exception using errcode = 'P0001', message = 'Daily quest is not complete';
  end if;

  insert into public.player_daily_quest_claims (
    player_id, quest_date, quest_id, reward
  ) values (
    p_user_id, v_today, p_quest_id, v_reward
  )
  on conflict do nothing
  returning claimed_at into v_claimed_at;
  if not found then
    raise exception using errcode = 'P0001', message = 'Daily quest already claimed';
  end if;

  if v_balance > 9007199254740991 - v_reward then
    raise exception using errcode = '22003', message = 'Balance exceeds supported range';
  end if;
  v_balance := v_balance + v_reward;
  v_balance_version := v_balance_version + 1;
  update public.player_wallets
    set balance = v_balance,
        balance_version = v_balance_version,
        updated_at = pg_catalog.now()
    where player_id = p_user_id;
  insert into public.leaderboard_outbox (
    event_id, player_id, balance, balance_version, win_amount
  ) values (
    pg_catalog.gen_random_uuid(), p_user_id, v_balance, v_balance_version, 0
  );

  return pg_catalog.jsonb_build_object(
    'balance', v_balance,
    'balanceVersion', v_balance_version,
    'questId', p_quest_id,
    'reward', v_reward,
    'claimedAt', v_claimed_at
  );
end;
$$;

revoke all on function public.get_dashboard_summary(uuid) from public, anon, authenticated;
revoke all on function public.get_popular_game_counts() from public, anon, authenticated;
revoke all on function public.claim_daily_bonus(uuid) from public, anon, authenticated;
revoke all on function public.claim_daily_quest(uuid, text) from public, anon, authenticated;
grant execute on function public.get_dashboard_summary(uuid) to service_role;
grant execute on function public.get_popular_game_counts() to service_role;
grant execute on function public.claim_daily_bonus(uuid) to service_role;
grant execute on function public.claim_daily_quest(uuid, text) to service_role;
