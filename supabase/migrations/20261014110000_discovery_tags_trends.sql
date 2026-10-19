-- Discovery: hidden theme tags on every popular tier list (built-in templates,
-- published templates, daily tier lists), for "Pour toi" recommendations, and a
-- trend score from the last days' views, completed rankings and favourites.

create table if not exists public.list_tags (
  list_key text primary key,          -- template key, or "daily-YYYY-MM-DD"
  tags text[] not null default '{}'
);
alter table public.list_tags enable row level security;

insert into public.list_tags (list_key, tags) values
  ('mobile-games', '{games,video-games,tech,apps,pop-culture}'),
  ('fruits', '{food,sweet,healthy,nature}'),
  ('desserts', '{food,sweet,comfort}'),
  ('animals', '{animals,nature,pets}'),
  ('sports', '{sports,leisure,outdoor}'),
  ('seasons', '{seasons,holidays,lifestyle}'),
  ('food', '{food,savory,cooking}'),
  ('vegetables', '{food,healthy,nature,cooking}'),
  ('drinks', '{drinks,food}'),
  ('cheeses', '{food,savory,france}'),
  ('breakfast', '{food,sweet,daily-life}'),
  ('destinations', '{travel,geography,culture}'),
  ('boardgames', '{games,board-games,leisure,party}'),
  ('movie-genres', '{movies,pop-culture,culture}'),
  ('music-genres', '{music,pop-culture,culture}'),
  ('instruments', '{music,culture}'),
  ('transport', '{transport,travel,daily-life}'),
  ('superpowers', '{fantasy,pop-culture,imagination}'),
  ('weekend', '{leisure,lifestyle,daily-life}'),
  ('school', '{school,kids,daily-life}'),
  ('cities-fr', '{travel,geography,france}'),
  ('pastries', '{food,sweet,france}'),
  ('video-game-genres', '{games,video-games,pop-culture}'),
  ('daily-2026-10-13', '{food,savory,fast-food}'),
  ('daily-2026-10-14', '{seasons,nature,lifestyle}'),
  ('daily-2026-10-15', '{food,sweet,france,daily-life}'),
  ('daily-2026-10-16', '{pop-culture,movies,fantasy}'),
  ('daily-2026-10-17', '{leisure,lifestyle,daily-life}'),
  ('daily-2026-10-18', '{food,savory,cooking}'),
  ('daily-2026-10-19', '{tech,apps,pop-culture}'),
  ('daily-2026-10-20', '{food,sweet,christmas,holidays}'),
  ('daily-2026-10-21', '{animals,pets,daily-life}'),
  ('daily-2026-10-22', '{games,board-games,party}'),
  ('daily-2026-10-23', '{daily-life,lifestyle}'),
  ('daily-2026-10-24', '{halloween,holidays,fantasy}'),
  ('daily-2026-10-25', '{food,savory,france,winter}'),
  ('daily-2026-10-26', '{sports,winter,outdoor}'),
  ('daily-2026-10-27', '{food,savory,school}'),
  ('daily-2026-10-28', '{movies,pop-culture,kids}'),
  ('daily-2026-10-29', '{drinks,winter,comfort}'),
  ('daily-2026-10-30', '{daily-life,work}'),
  ('daily-2026-10-31', '{food,sweet,kids}'),
  ('daily-2026-11-01', '{daily-life,work}'),
  ('daily-2026-11-02', '{food,healthy,seasons,cooking}'),
  ('daily-2026-11-03', '{transport,daily-life,travel}'),
  ('daily-2026-11-04', '{lifestyle,comfort}'),
  ('daily-2026-11-05', '{music,culture}'),
  ('daily-2026-11-06', '{food,savory,fast-food}'),
  ('daily-2026-11-07', '{work,lifestyle,imagination}'),
  ('daily-2026-11-08', '{fantasy,culture,kids}'),
  ('daily-2026-11-09', '{food,savory,cooking}'),
  ('daily-2026-11-10', '{tech,apps,daily-life}'),
  ('daily-2026-11-11', '{food,holidays,party}')
on conflict (list_key) do update set tags = excluded.tags;

-- A view counts at its latest date (one row per device and list), so recent
-- interest shows in the trends.
create or replace function public.record_template_view(template_key text, device_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.hit('record_template_view', 300);
  insert into public.template_views (template_key, device_id)
  values (record_template_view.template_key, record_template_view.device_id)
  on conflict on constraint template_views_pkey do update set created_at = now();
end;
$function$;

-- Tags of every list, and its trend score: views (1), completed rankings (3) and
-- favourites (4) of the last 14 days, each fading with age (halved every ~2 days).
create or replace function public.get_discovery()
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  with events as (
    select tv.template_key as k, 1.0 as w, tv.created_at as at from public.template_views tv
      where tv.created_at > now() - interval '14 days'
    union all
    select split_part(lv.list_key, ':', 2), 3.0, lv.updated_at from public.list_votes lv
      where lv.list_key like 'popular:%' and lv.updated_at > now() - interval '14 days'
    union all
    select 'daily-' || dv.day, 3.0, dv.created_at from public.daily_votes dv
      where dv.created_at > now() - interval '14 days'
    union all
    select tf.template_key, 4.0, tf.updated_at from public.template_favorites tf
      where tf.active and tf.updated_at > now() - interval '14 days'
  ),
  trends as (
    select k, round(sum(w * exp(-extract(epoch from now() - at) / 86400.0 / 3))::numeric, 2) as score
    from events group by k
  )
  select jsonb_build_object(
    'tags', coalesce((select jsonb_object_agg(lt.list_key, lt.tags) from public.list_tags lt), '{}'::jsonb),
    'trends', coalesce((select jsonb_object_agg(t.k, t.score) from trends t), '{}'::jsonb)
  );
$function$;

revoke all on function public.get_discovery() from public;
grant execute on function public.get_discovery() to anon, authenticated;
