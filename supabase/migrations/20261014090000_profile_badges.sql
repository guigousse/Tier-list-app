-- Badges shown on a player's profile (chosen on the reward path), up to 3.
alter table public.profiles
  add column if not exists badges text[] not null default '{}'
  check (cardinality(badges) <= 3 and array_to_string(badges, ',') ~ '^([a-z0-9-]{1,24}(,|$))*$');

create or replace function private.card(profile_id uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'id', p.id,
    'pseudo', case when p.hidden then 'Joueur signalé' else p.pseudo end,
    'tag', p.tag,
    'avatar', case when p.hidden then '🚫' else p.avatar end,
    'hidden', p.hidden,
    'badges', case when p.hidden then '{}'::text[] else p.badges end,
    'completed',
      (select count(*) from public.list_votes lv where lv.device_id = p.device_id and lv.list_key like 'popular:%')
      + (select count(*) from public.daily_votes dv where dv.device_id = p.device_id)
  )
  from public.profiles p where p.id = profile_id;
$function$;

create or replace function public.set_badges(secret text, badges text[])
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  me uuid := private.me(secret);
begin
  perform private.hit('set_badges', 60);
  if cardinality(coalesce(badges, '{}')) > 3
     or exists (select 1 from unnest(badges) b where b !~ '^[a-z0-9-]{1,24}$') then
    raise exception 'invalid badges';
  end if;
  update public.profiles p set badges = coalesce(set_badges.badges, '{}'), updated_at = now() where p.id = me;
end;
$function$;

revoke all on function public.set_badges(text, text[]) from public;
grant execute on function public.set_badges(text, text[]) to anon, authenticated;
