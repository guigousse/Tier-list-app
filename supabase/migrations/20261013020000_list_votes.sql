-- Rankings of the popular tier lists (built-in or published templates), one per
-- device and list. Unlike daily votes, a player can change theirs: the latest wins.
-- list_key identifies the list and its exact cards (the app adds a hash of the
-- items), so editing a template's cards starts fresh statistics.
create table public.list_votes (
  list_key text not null check (char_length(list_key) between 1 and 120),
  device_id uuid not null,
  ranks smallint[] not null,
  updated_at timestamptz not null default now(),
  primary key (list_key, device_id)
);
alter table public.list_votes enable row level security;

-- Records or replaces this device's ranking (ranks[i]: 0 = S … 4 = D for item i).
create or replace function public.submit_list_vote(list_key text, device_id uuid, ranks smallint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if cardinality(ranks) not between 1 and 300
     or exists (select 1 from unnest(ranks) r where r is null or r < 0 or r > 4) then
    raise exception 'invalid ranking';
  end if;
  insert into public.list_votes (list_key, device_id, ranks)
  values (submit_list_vote.list_key, submit_list_vote.device_id, ranks)
  on conflict on constraint list_votes_pkey
  do update set ranks = excluded.ranks, updated_at = now();
end;
$$;

-- Aggregated results: number of players and, per item, the average tier and the
-- number of votes for each tier.
create or replace function public.get_list_results(list_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with v as (
    select lv.ranks from public.list_votes lv where lv.list_key = get_list_results.list_key
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

revoke all on function public.submit_list_vote(text, uuid, smallint[]) from public;
revoke all on function public.get_list_results(text) from public;
grant execute on function public.submit_list_vote(text, uuid, smallint[]) to anon, authenticated;
grant execute on function public.get_list_results(text) to anon, authenticated;
