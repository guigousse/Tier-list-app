-- The favourite card of each public list: the one players rank S most often, shown as
-- the list's picture in the app (src/lib/listCover.ts). Counted from the votes: a
-- ranking's i-th value is the tier of the list's i-th card (0 = S), the cards of a public
-- list only ever being added to, so an index means the same card across versions. Daily
-- lists count both their day's votes and those of players who caught up later (as
-- `popular:daily-YYYY-MM-DD:…`). Ties go to the first card. Test: supabase/tests/list_tops.sql.
create or replace function public.get_list_tops()
 returns table(template_key text, top integer)
 language plpgsql
 -- Volatile: the rate limit writes its counter.
 volatile
 security definer
 set search_path to ''
as $$
begin
  perform private.hit('get_list_tops', 300);
  return query
    with s as (
      select split_part(lv.list_key, ':', 2) as k, (u.i - 1)::integer as idx
      from public.list_votes lv, unnest(lv.ranks) with ordinality as u(r, i)
      where lv.list_key like 'popular:%' and u.r = 0
      union all
      select 'daily-' || dv.day::text, (u.i - 1)::integer
      from public.daily_votes dv, unnest(dv.ranks) with ordinality as u(r, i)
      where u.r = 0
    ), counted as (
      select s.k, s.idx, count(*) as n from s group by s.k, s.idx
    )
    select distinct on (c.k) c.k, c.idx from counted c order by c.k, c.n desc, c.idx;
end;
$$;

revoke all on function public.get_list_tops() from public;
grant execute on function public.get_list_tops() to anon, authenticated;
