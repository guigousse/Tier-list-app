-- Translated content and regional lists.
-- The probe used to check cf-ipcountry, closed to the API (a drop hangs the MCP tool).
revoke all on function public.tmp_probe_country() from public, anon, authenticated;

-- Translations of the French content (built-in lists, themes, templates, daily lists).
-- items[i] and tiers[i] translate the source's items[i] and tiers[i]: votes count by
-- position, and players' copies keep the French labels, translated only on screen, so
-- a list ranked in Greek and one ranked in French add up to the same results.
create table public.content_translations (
  kind text not null check (kind in ('builtin', 'theme', 'template', 'daily')),
  key text not null check (kind <> 'daily' or key ~ '^\d{4}-\d{2}-\d{2}$'),
  lang text not null check (lang in ('en', 'es', 'el')),
  title text,
  description text,
  items text[],
  tiers text[],
  updated_at timestamptz not null default now(),
  primary key (kind, key, lang)
);
alter table public.content_translations enable row level security;
-- Same rule as daily_lists: a future daily list must not leak through its translation.
create policy "Translations of visible content are public" on public.content_translations
  for select to anon, authenticated
  using (kind <> 'daily' or key::date <= (now() at time zone 'utc')::date + 1);
grant select on public.content_translations to anon, authenticated;

-- regions: where a list is put forward (null = everywhere). vote_regions: the only
-- countries whose players may vote on it (null = everyone), e.g. a national election.
alter table public.templates
  add column regions text[] check (regions is null or cardinality(regions) > 0),
  add column vote_regions text[] check (vote_regions is null or cardinality(vote_regions) > 0);
alter table public.daily_lists
  add column regions text[] check (regions is null or cardinality(regions) > 0),
  add column vote_regions text[] check (vote_regions is null or cardinality(vote_regions) > 0);

-- The caller's country, as Cloudflare saw its IP (cf-ipcountry). Checked on the project:
-- a client sending its own cf-ipcountry header is overwritten, so it cannot be faked
-- short of a VPN. Null outside an API call.
create or replace function public.request_country()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(upper(current_setting('request.headers', true)::json ->> 'cf-ipcountry'), '');
$$;

-- Whether the caller may vote on a list restricted to `allowed` (null = no restriction).
-- An unknown country (XX, Tor's T1, no header) is refused: the restriction exists for
-- lists where a vote from outside would be a problem.
create or replace function public.vote_allowed(allowed text[])
returns boolean
language sql
stable
set search_path = ''
as $$
  select allowed is null or coalesce(public.request_country() = any (allowed), false);
$$;

-- Same as the live versions (abuse limits, re-ranking the daily list), plus the region check.
create or replace function public.submit_daily_vote(day date, device_id uuid, ranks smallint[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_count int;
  allowed text[];
begin
  perform private.hit('daily_vote', 120);
  select cardinality(d.items), d.vote_regions into item_count, allowed
  from public.daily_lists d
  where d.day = submit_daily_vote.day and d.day <= (now() at time zone 'utc')::date + 1;
  if item_count is null then
    raise exception 'unknown daily tier list';
  end if;
  if not public.vote_allowed(allowed) then
    raise exception 'region_locked';
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

-- list_key is 'popular:<template key>:<hash of the items>' (popularVoteKey in the app).
create or replace function public.submit_list_vote(list_key text, device_id uuid, ranks smallint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit('list_vote', 300);
  if submit_list_vote.list_key not like 'popular:%' or not private.is_public_list(split_part(submit_list_vote.list_key, ':', 2)) then
    raise exception 'unknown list';
  end if;
  if not public.vote_allowed((select t.vote_regions from public.templates t
                              where t.key = split_part(submit_list_vote.list_key, ':', 2))) then
    raise exception 'region_locked';
  end if;
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

revoke all on function public.request_country() from public, anon, authenticated;
revoke all on function public.vote_allowed(text[]) from public, anon, authenticated;
