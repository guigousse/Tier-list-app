-- Validated rankings of the daily tier list, one per device and day, final once sent.
-- ranks[i] is the tier (0 = S … 4 = D) given to daily_lists.items[i]. Daily tier
-- lists always use the classic S, A, B, C, D tiers (daily_lists.tiers is ignored).
create table public.daily_votes (
  day date not null references public.daily_lists (day) on delete cascade,
  device_id uuid not null,
  ranks smallint[] not null,
  created_at timestamptz not null default now(),
  primary key (day, device_id)
);
alter table public.daily_votes enable row level security;

-- Records a validated ranking. Returns false if this device already voted that day.
create or replace function public.submit_daily_vote(day date, device_id uuid, ranks smallint[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_count int;
begin
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
  on conflict do nothing;
  return found;
end;
$$;

-- Aggregated results of a daily tier list: number of votes and, per item (same
-- order as daily_lists.items), the average tier and how many votes each tier got.
create or replace function public.get_daily_results(day date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select dv.ranks from public.daily_votes dv where dv.day = get_daily_results.day
  ),
  per_item as (
    select r.idx, avg(r.rank)::float as average,
           array[count(*) filter (where r.rank = 0), count(*) filter (where r.rank = 1), count(*) filter (where r.rank = 2),
                 count(*) filter (where r.rank = 3), count(*) filter (where r.rank = 4)] as counts
    from v, unnest(v.ranks) with ordinality as r(rank, idx)
    group by r.idx
  )
  select jsonb_build_object(
    'votes', (select count(*) from v),
    'items', coalesce((select jsonb_agg(jsonb_build_object('average', p.average, 'counts', p.counts) order by p.idx) from per_item p), '[]'::jsonb)
  );
$$;

revoke all on function public.submit_daily_vote(date, uuid, smallint[]) from public;
revoke all on function public.get_daily_results(date) from public;
grant execute on function public.submit_daily_vote(date, uuid, smallint[]) to anon, authenticated;
grant execute on function public.get_daily_results(date) to anon, authenticated;
