-- Popularity of the popular tier lists (built-in or published templates): unique
-- views and favourites, one row per device and list. A favourite that is removed
-- keeps its row with active = false.
create table public.template_views (
  template_key text not null check (char_length(template_key) between 1 and 80),
  device_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (template_key, device_id)
);
alter table public.template_views enable row level security;

create table public.template_favorites (
  template_key text not null check (char_length(template_key) between 1 and 80),
  device_id uuid not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (template_key, device_id)
);
alter table public.template_favorites enable row level security;

-- Counts this device's view of a list (once per device).
create or replace function public.record_template_view(template_key text, device_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit('record_template_view', 300);
  insert into public.template_views (template_key, device_id)
  values (record_template_view.template_key, record_template_view.device_id)
  on conflict on constraint template_views_pkey do nothing;
end;
$$;

-- Adds or removes this device's favourite on a list.
create or replace function public.set_template_favorite(template_key text, device_id uuid, favorite boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.hit('set_template_favorite', 300);
  insert into public.template_favorites (template_key, device_id, active)
  values (set_template_favorite.template_key, set_template_favorite.device_id, favorite)
  on conflict on constraint template_favorites_pkey
  do update set active = excluded.active, updated_at = now();
end;
$$;

-- Unique views and favourites of every list that has some.
create or replace function public.get_template_stats()
returns table (template_key text, views bigint, favorites bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with v as (select tv.template_key, count(*) as n from public.template_views tv group by tv.template_key),
       f as (select tf.template_key, count(*) as n from public.template_favorites tf where tf.active group by tf.template_key)
  select coalesce(v.template_key, f.template_key), coalesce(v.n, 0), coalesce(f.n, 0)
  from v full join f on f.template_key = v.template_key;
$$;

revoke all on function public.record_template_view(text, uuid) from public;
revoke all on function public.set_template_favorite(text, uuid, boolean) from public;
revoke all on function public.get_template_stats() from public;
grant execute on function public.record_template_view(text, uuid) to anon, authenticated;
grant execute on function public.set_template_favorite(text, uuid, boolean) to anon, authenticated;
grant execute on function public.get_template_stats() to anon, authenticated;
