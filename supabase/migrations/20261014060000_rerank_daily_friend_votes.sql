-- The daily tier list can be ranked again, like the popular ones: the latest ranking
-- of a device replaces the previous one. Friends' rankings of one list, for the
-- "Amis" tab of the results.

create or replace function public.submit_daily_vote(day date, device_id uuid, ranks smallint[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_count int;
begin
  perform private.hit('daily_vote', 120);
  select cardinality(d.items) into item_count
  from public.daily_lists d
  where d.day = submit_daily_vote.day and d.day <= (now() at time zone 'utc')::date + 1;
  if item_count is null then
    raise exception 'unknown daily tier list';
  end if;
  if cardinality(ranks) <> item_count or exists (select 1 from unnest(ranks) r where r is null or r < 0 or r > 4) then
    raise exception 'invalid ranking';
  end if;
  insert into public.daily_votes (day, device_id, ranks)
  values (submit_daily_vote.day, submit_daily_vote.device_id, ranks)
  on conflict on constraint daily_votes_pkey do update set ranks = excluded.ranks;
  return true;
end;
$$;

-- Accepted friends who validated the list `key` (a popular list key, or
-- "daily:YYYY-MM-DD"), with their ranking.
create or replace function public.get_friends_votes(secret text, key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  return coalesce((
    select jsonb_agg(private.card(f.id) || jsonb_build_object('ranks', v.ranks))
    from public.friend_links fl
    join public.profiles f on f.id = case when fl.a = me then fl.b else fl.a end
    cross join lateral (
      select lv.ranks from public.list_votes lv
      where key not like 'daily:%' and lv.list_key = key and lv.device_id = f.device_id
      union all
      select dv.ranks from public.daily_votes dv
      where dv.day = (case when key like 'daily:%' then substr(key, 7)::date end) and dv.device_id = f.device_id
    ) v
    where (fl.a = me or fl.b = me) and fl.status = 'accepted' and not f.hidden
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_friends_votes(text, text) from public;
grant execute on function public.get_friends_votes(text, text) to anon, authenticated;
