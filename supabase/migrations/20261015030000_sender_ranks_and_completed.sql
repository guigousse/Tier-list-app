-- Tier lists between friends count, and the sender's ranking follows their list.
--
-- `completed` (shown on profiles) counted only popular and daily rankings: a friend
-- who ranked lists sent to them stayed at 0. It now also counts, once per list
-- (content_hash), the received lists they ranked and the lists they sent ranked
-- to the end.
--
-- The sender's ranking was frozen when the list was sent, often before they had
-- ranked it themselves: the friend's comparison then showed an empty column. The
-- app now sends it again each time the sender ranks their own list.

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
      + (select count(distinct m.content_hash) from public.list_mail m
         where (m.recipient = p.id and m.status = 'ranked')
            or (m.sender = p.id and not (-1::smallint = any (m.sender_ranks))))
  )
  from public.profiles p where p.id = profile_id;
$function$;

-- The sender's current ranking of a list they sent (tier index per card, -1 unranked).
create or replace function public.set_sender_ranks(secret text, mail uuid, ranks smallint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
  m public.list_mail;
  tiers integer;
begin
  perform private.hit('set_sender_ranks', 300);
  select * into m from public.list_mail lm where lm.id = mail and lm.sender = me;
  if m.id is null then
    raise exception 'mail not found';
  end if;
  tiers := jsonb_array_length(m.payload->'r');
  if coalesce(array_length(ranks, 1), 0) <> jsonb_array_length(m.payload->'c')
     or exists (select 1 from unnest(ranks) r where r is null or r < -1 or r >= tiers) then
    raise exception 'invalid ranking';
  end if;
  update public.list_mail lm set sender_ranks = ranks where lm.id = mail;
end;
$$;

revoke all on function public.set_sender_ranks(text, uuid, smallint[]) from public;
grant execute on function public.set_sender_ranks(text, uuid, smallint[]) to anon, authenticated;
