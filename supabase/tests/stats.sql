-- The statistics (20261018010000_stats.sql). Run on the project: the block always fails at
-- the end, nothing kept. Expected error message: 'OK'.
do $$
declare
  d jsonb;
  pizza_before int;
  players_before int;
  pizza_pct numeric;
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
begin
  -- Closed to the app's roles.
  if has_schema_privilege('anon', 'stats', 'USAGE') or has_schema_privilege('authenticated', 'stats', 'USAGE') then
    raise exception 'FAIL: stats readable by the API';
  end if;

  select coalesce(sum(players) filter (where badge = 'pizza'), 0) into pizza_before from stats.teams where fork = 'food';
  select players into players_before from stats.players;

  -- Three new players, two Team Pizza, one Team Burger; two of them also Team Chat.
  insert into public.badge_choices (device_id, fork, badge) values
    (a, 'food', 'pizza'), (b, 'food', 'pizza'), (c, 'food', 'burger'), (a, 'pet', 'cat'), (b, 'pet', 'cat');

  if (select players from stats.players) <> players_before + 3 then raise exception 'FAIL: players not counted'; end if;
  if (select players from stats.teams where fork = 'food' and badge = 'pizza') <> pizza_before + 2 then raise exception 'FAIL: team pizza'; end if;
  select sum(pct) into pizza_pct from stats.teams where fork = 'food';
  if pizza_pct not between 99.8 and 100.2 then raise exception 'FAIL: team shares add to %', pizza_pct; end if;
  if not exists (select 1 from stats.team_pairs where fork_a = 'food' and badge_a = 'pizza' and fork_b = 'pet' and badge_b = 'cat' and players >= 2) then
    raise exception 'FAIL: team pairs';
  end if;

  -- One JSON with every block.
  d := stats.dashboard();
  if (select count(*) from jsonb_object_keys(d)) <> 17 then raise exception 'FAIL: dashboard keys %', (select count(*) from jsonb_object_keys(d)); end if;
  raise exception 'OK';
end;
$$;
