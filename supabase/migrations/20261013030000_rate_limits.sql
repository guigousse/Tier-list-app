-- Abuse protection for the public functions: per-IP hourly limits.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.rate_limits (
  ip text not null,
  action text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (ip, action, window_start)
);

-- Client IP as forwarded by the Supabase API gateway.
create or replace function private.client_ip()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.headers', true)::json->>'cf-connecting-ip', ''),
    nullif(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), ''),
    'unknown'
  );
$$;

-- Counts one call of `action` for the client IP in the current hour and fails past `max_hits`.
create or replace function private.hit(action text, max_hits integer)
returns void
language plpgsql
set search_path = ''
as $$
#variable_conflict use_column
declare
  n integer;
begin
  insert into private.rate_limits (ip, action, window_start)
  values (private.client_ip(), hit.action, date_trunc('hour', now()))
  on conflict (ip, action, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into n;
  if n > max_hits then
    raise exception 'too many requests' using errcode = 'P0429';
  end if;
end;
$$;

alter table public.shared_lists add column last_opened_at timestamptz;

-- Public functions now call private.hit() first: share_list 30/h, get_shared_list
-- 300/h (also records last_opened_at; makes guessing codes impractical),
-- submit_daily_vote 120/h, submit_list_vote 300/h. See the live definitions with
-- `select pg_get_functiondef('public.share_list'::regproc);`.

create extension if not exists pg_cron;
