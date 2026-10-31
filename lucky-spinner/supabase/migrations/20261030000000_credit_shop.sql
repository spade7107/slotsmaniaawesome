create table public.player_boost_inventory (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  player_id uuid not null references auth.users (id) on delete cascade,
  tier text not null check (tier in ('basic', 'plus', 'premium')),
  purchase_operation_id uuid not null,
  status text not null default 'available'
    check (status in ('available', 'active', 'exhausted')),
  remaining_plays integer not null default 25 check (remaining_plays between 0 and 25),
  purchased_at timestamptz not null default pg_catalog.now(),
  activated_at timestamptz,
  completed_at timestamptz,
  constraint player_boost_inventory_state check (
    (status = 'available' and remaining_plays = 25 and activated_at is null and completed_at is null)
    or (status = 'active' and remaining_plays between 1 and 25 and activated_at is not null and completed_at is null)
    or (status = 'exhausted' and remaining_plays = 0 and activated_at is not null and completed_at is not null)
  ),
  constraint player_boost_inventory_one_purchase unique (player_id, purchase_operation_id)
);

create unique index player_boost_inventory_one_active
  on public.player_boost_inventory (player_id)
  where status = 'active';
create index player_boost_inventory_player_recent
  on public.player_boost_inventory (player_id, purchased_at desc);

alter table public.player_boost_inventory enable row level security;
revoke all on public.player_boost_inventory from anon, authenticated;
grant all on public.player_boost_inventory to service_role;

create function public.purchase_credit_boost(
  p_user_id uuid,
  p_tier text,
  p_operation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_price bigint;
  current_balance bigint;
  current_version bigint;
  resulting_balance bigint;
  resulting_version bigint;
  new_item public.player_boost_inventory%rowtype;
  existing_item public.player_boost_inventory%rowtype;
begin
  if p_user_id is null or p_operation_id is null or p_tier is null
    or p_tier not in ('basic', 'plus', 'premium')
  then
    raise exception using errcode = '22023', message = 'Invalid boost purchase';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_user_id::text || ':' || p_operation_id::text)
  );
  select * into existing_item from public.player_boost_inventory
    where player_id = p_user_id and purchase_operation_id = p_operation_id;
  if found then
    select balance, balance_version into current_balance, current_version
      from public.player_wallets where player_id = p_user_id;
    return pg_catalog.jsonb_build_object(
      'balance', current_balance,
      'balanceVersion', current_version,
      'item', pg_catalog.to_jsonb(existing_item),
      'replayed', true
    );
  end if;

  item_price := case p_tier when 'basic' then 100 when 'plus' then 250 else 500 end;
  insert into public.player_wallets (player_id) values (p_user_id)
    on conflict (player_id) do nothing;
  select balance, balance_version into current_balance, current_version
    from public.player_wallets where player_id = p_user_id for update;
  if current_balance < item_price then
    raise exception using errcode = 'P0001', message = 'Insufficient credits';
  end if;

  resulting_balance := current_balance - item_price;
  resulting_version := current_version + 1;
  update public.player_wallets
    set balance = resulting_balance,
        balance_version = resulting_version,
        updated_at = pg_catalog.now()
    where player_id = p_user_id;

  insert into public.player_boost_inventory (
    player_id, tier, purchase_operation_id
  ) values (
    p_user_id, p_tier, p_operation_id
  ) returning * into new_item;

  insert into public.leaderboard_outbox (
    event_id, player_id, balance, balance_version, win_amount
  ) values (
    pg_catalog.gen_random_uuid(), p_user_id, resulting_balance, resulting_version, 0
  );

  return pg_catalog.jsonb_build_object(
    'balance', resulting_balance,
    'balanceVersion', resulting_version,
    'item', pg_catalog.to_jsonb(new_item),
    'replayed', false
  );
end;
$$;

create function public.activate_credit_boost(
  p_user_id uuid,
  p_inventory_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_item public.player_boost_inventory%rowtype;
  active_item public.player_boost_inventory%rowtype;
begin
  if p_user_id is null or p_inventory_id is null then
    raise exception using errcode = '22023', message = 'Invalid boost activation';
  end if;

  perform 1 from public.player_wallets
    where player_id = p_user_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Player wallet not found';
  end if;

  select * into active_item from public.player_boost_inventory
    where player_id = p_user_id and status = 'active' for update;
  if found then
    if active_item.id = p_inventory_id then
      return pg_catalog.jsonb_build_object(
        'activeBoost', pg_catalog.jsonb_build_object(
          'id', active_item.id,
          'tier', active_item.tier,
          'remainingPlays', active_item.remaining_plays
        ),
        'replayed', true
      );
    end if;
    raise exception using errcode = 'P0001', message = 'Another boost is already active';
  end if;

  select * into current_item from public.player_boost_inventory
    where id = p_inventory_id and player_id = p_user_id for update;
  if not found or current_item.status <> 'available' then
    raise exception using errcode = 'P0001', message = 'Boost is not available';
  end if;

  update public.player_boost_inventory
    set status = 'active', activated_at = pg_catalog.now()
    where id = p_inventory_id
    returning * into current_item;

  return pg_catalog.jsonb_build_object(
    'activeBoost', pg_catalog.jsonb_build_object(
      'id', current_item.id,
      'tier', current_item.tier,
      'remainingPlays', current_item.remaining_plays
    ),
    'replayed', false
  );
end;
$$;

create function public.apply_game_round_with_boost(
  p_user_id uuid,
  p_operation_id uuid,
  p_game text,
  p_wager bigint,
  p_payout bigint,
  p_result jsonb,
  p_expected_boost_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_round public.game_rounds%rowtype;
  active_item public.player_boost_inventory%rowtype;
  round_response jsonb;
  active_boost jsonb;
  has_active boolean;
  wager_limit bigint;
begin
  if p_user_id is null or p_operation_id is null or p_game is null
    or p_game not in ('slots', 'prize-wheel')
    or p_wager is null or p_wager <= 0
    or p_payout is null or p_payout < 0
    or p_result is null
  then
    raise exception using errcode = '22023', message = 'Invalid boosted game round';
  end if;

  perform 1 from public.player_wallets
    where player_id = p_user_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'Player wallet not found';
  end if;

  select * into existing_round from public.game_rounds
    where player_id = p_user_id and operation_id = p_operation_id;
  if found then
    select * into active_item from public.player_boost_inventory
      where player_id = p_user_id and status = 'active';
    active_boost := case when found then pg_catalog.jsonb_build_object(
      'id', active_item.id,
      'tier', active_item.tier,
      'remainingPlays', active_item.remaining_plays,
      'maxBet', case active_item.tier when 'basic' then 10 when 'plus' then 50 else 100 end,
      'winRateIncrease', case active_item.tier when 'basic' then 5 when 'plus' then 10 else 15 end
    ) else null end;
    return pg_catalog.jsonb_build_object(
      'balance', existing_round.balance_after,
      'balanceVersion', existing_round.balance_version,
      'result', existing_round.result,
      'netProfit', existing_round.net_profit,
      'replayed', true,
      'activeBoost', active_boost
    );
  end if;

  select * into active_item from public.player_boost_inventory
    where player_id = p_user_id and status = 'active' for update;
  has_active := found;
  if has_active is distinct from (p_expected_boost_id is not null)
    or (has_active and active_item.id <> p_expected_boost_id)
  then
    raise exception using errcode = '40001', message = 'Active boost changed; retry this spin';
  end if;
  if has_active then
    wager_limit := case active_item.tier when 'basic' then 10 when 'plus' then 50 else 100 end;
    if p_wager > wager_limit then
      raise exception using errcode = 'P0001', message = 'Wager exceeds the active boost limit';
    end if;
  end if;

  round_response := public.apply_game_round(
    p_user_id, null, p_operation_id, p_game, p_wager, p_payout, p_result
  );

  if has_active and not coalesce((round_response ->> 'replayed')::boolean, false) then
    update public.player_boost_inventory
      set remaining_plays = remaining_plays - 1,
          status = case when remaining_plays = 1 then 'exhausted' else 'active' end,
          completed_at = case when remaining_plays = 1 then pg_catalog.now() else null end
      where id = active_item.id
      returning * into active_item;
  end if;

  if has_active and active_item.status = 'active' then
    active_boost := pg_catalog.jsonb_build_object(
      'id', active_item.id,
      'tier', active_item.tier,
      'remainingPlays', active_item.remaining_plays,
      'maxBet', case active_item.tier when 'basic' then 10 when 'plus' then 50 else 100 end,
      'winRateIncrease', case active_item.tier when 'basic' then 5 when 'plus' then 10 else 15 end
    );
  else
    active_boost := null;
  end if;

  return round_response || pg_catalog.jsonb_build_object('activeBoost', active_boost);
end;
$$;

revoke all on function public.purchase_credit_boost(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.activate_credit_boost(uuid, uuid) from public, anon, authenticated;
revoke all on function public.apply_game_round_with_boost(uuid, uuid, text, bigint, bigint, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.purchase_credit_boost(uuid, text, uuid) to service_role;
grant execute on function public.activate_credit_boost(uuid, uuid) to service_role;
grant execute on function public.apply_game_round_with_boost(uuid, uuid, text, bigint, bigint, jsonb, uuid)
  to service_role;
