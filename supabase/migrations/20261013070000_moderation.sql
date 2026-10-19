-- Moderation of player profiles.
--
-- Pseudos: refused if they contain a banned word, after normalisation (lower case,
-- no accents, leetspeak "s4l0pe" → "salope", repeated letters collapsed, spaces and
-- symbols removed). Words marked whole only match a whole word or the whole pseudo
-- ("con" refuses "Le con" but not "Conan"). Add words with:
--   insert into private.banned_words (word, whole) values ('mot', false);
-- Avatars: only the ones offered by the app.
-- Reports: a player can report another (it also ends their friendship). From 3
-- reporters, the profile is hidden: shown as « Joueur signalé » and unreachable by
-- friend requests. Unhide with: update public.profiles set hidden = false where …

create table private.banned_words (
  word text primary key,
  whole boolean not null default false
);

insert into private.banned_words (word, whole) values
  ('salope', false),
  ('salaud', false),
  ('encule', false),
  ('enculer', false),
  ('connard', false),
  ('connasse', false),
  ('pouffiasse', false),
  ('petasse', false),
  ('batard', false),
  ('bougnoul', false),
  ('negre', false),
  ('negro', true),
  ('nigger', true),
  ('nigga', true),
  ('youpin', false),
  ('pedophile', false),
  ('pedophil', false),
  ('nazi', true),
  ('hitler', false),
  ('fuck', false),
  ('fucker', false),
  ('motherfucker', false),
  ('bitch', false),
  ('whore', false),
  ('slut', false),
  ('cunt', false),
  ('asshole', false),
  ('faggot', false),
  ('tapette', false),
  ('tarlouze', false),
  ('gouine', false),
  ('putain', false),
  ('couille', false),
  ('branleur', false),
  ('branlette', false),
  ('porno', false),
  ('porn', true),
  ('merde', false),
  ('violeur', false),
  ('suicide', false),
  ('terroriste', false),
  ('jihad', false),
  ('djihad', false),
  ('pornhub', false),
  ('enfoire', false),
  ('ordure', false),
  ('abruti', false),
  ('debile', false),
  ('pute', true),
  ('putes', true),
  ('nique', true),
  ('niquer', true),
  ('ntm', true),
  ('fdp', true),
  ('pd', true),
  ('tg', true),
  ('con', true),
  ('cons', true),
  ('bite', true),
  ('bites', true),
  ('chatte', true),
  ('zizi', true),
  ('sexe', true),
  ('sex', true),
  ('viol', true),
  ('isis', true),
  ('daech', true),
  ('cul', true),
  ('teub', true),
  ('pedale', true),
  ('nsfw', true),
  ('anal', true),
  ('penis', true),
  ('vagin', true),
  ('shit', true),
  ('dick', true),
  ('cock', true),
  ('pussy', true),
  ('tits', true),
  ('nazis', true),
  ('hitlerien', true),
  ('retard', true),
  ('retarde', true),
  ('mongol', true),
  ('autiste', true),
  ('negresse', true),
  ('bougnoule', true)
on conflict do nothing;

create or replace function private.normalize(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    regexp_replace(
      translate(translate(lower(t), 'àâäáãåāçćčéèêëēęíìîïīñńóòôöõøōúùûüūýÿœæß', 'aaaaaaaccceeeeeeiiiiinnooooooouuuuuyyoas'), '0134578@$!|€', 'oieastbasiie'),
      '[^a-z]+', ' ', 'g'),
    '([a-z])\1+', '\1', 'g');
$$;

-- Whether a pseudo contains a banned word.
create or replace function private.is_offensive(pseudo text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with n as (select btrim(private.normalize(pseudo)) as words, replace(private.normalize(pseudo), ' ', '') as compact)
  select exists (
    select 1 from private.banned_words b, n
    where (not b.whole and position(replace(private.normalize(b.word), ' ', '') in n.compact) > 0)
       or (b.whole and (private.normalize(b.word) = any (string_to_array(n.words, ' ')) or private.normalize(b.word) = n.compact))
  );
$$;

-- Trimmed pseudo, or an error if it isn't 2 to 20 letters, digits, spaces, "_", "-"
-- or ".", or if it is offensive.
create or replace function private.clean_pseudo(pseudo text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  p text := regexp_replace(btrim(clean_pseudo.pseudo), '\s+', ' ', 'g');
begin
  if p !~ '^[[:alnum:] _.-]{2,20}$' then
    raise exception 'invalid pseudo';
  end if;
  if private.is_offensive(p) then
    raise exception 'pseudo refused';
  end if;
  return p;
end;
$$;

create or replace function private.check_avatar(avatar text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if not (avatar = any (array['🦊', '🐼', '🐸', '🐙', '🦁', '🐯', '🐨', '🐵', '🦄', '🐲', '🦉', '🐧', '🐳', '🦖', '👾', '🤖', '👻', '🎃', '🌵', '🍄', '🔥', '⚡', '🌈', '👑'])) then
    raise exception 'invalid avatar';
  end if;
  return avatar;
end;
$$;

alter table public.profiles add column hidden boolean not null default false;

create table public.player_reports (
  reporter uuid not null references public.profiles (id) on delete cascade,
  reported uuid not null references public.profiles (id) on delete cascade,
  reason text not null default 'pseudo' check (char_length(reason) <= 40),
  created_at timestamptz not null default now(),
  primary key (reporter, reported)
);
alter table public.player_reports enable row level security;

-- Public part of a profile; hidden profiles are masked.
create or replace function private.card(profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'pseudo', case when p.hidden then 'Joueur signalé' else p.pseudo end,
    'tag', p.tag,
    'avatar', case when p.hidden then '🚫' else p.avatar end,
    'hidden', p.hidden,
    'completed',
      (select count(*) from public.list_votes lv where lv.device_id = p.device_id and lv.list_key like 'popular:%')
      + (select count(*) from public.daily_votes dv where dv.device_id = p.device_id)
  )
  from public.profiles p where p.id = profile_id;
$$;

create or replace function public.create_profile(device_id uuid, secret text, pseudo text, avatar text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := private.clean_pseudo(pseudo);
  pic text := private.check_avatar(avatar);
  new_id uuid;
begin
  perform private.hit('create_profile', 10);
  if char_length(secret) < 32 then
    raise exception 'invalid secret';
  end if;
  for attempt in 1..30 loop
    insert into public.profiles (device_id, secret_hash, pseudo, tag, avatar)
    values (create_profile.device_id, encode(sha256(convert_to(secret, 'UTF8')), 'hex'), clean, 1000 + floor(random() * 9000)::int, pic)
    on conflict do nothing
    returning id into new_id;
    if new_id is not null then
      return private.card(new_id);
    end if;
    if exists (select 1 from public.profiles p where p.device_id = create_profile.device_id) then
      return private.card(private.me(secret));
    end if;
  end loop;
  raise exception 'pseudo unavailable';
end;
$$;

create or replace function public.update_profile(secret text, pseudo text, avatar text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
  clean text := private.clean_pseudo(pseudo);
  pic text := private.check_avatar(avatar);
  current_tag smallint;
begin
  perform private.hit('update_profile', 30);
  select p.tag into current_tag from public.profiles p where p.id = me;
  for attempt in 1..30 loop
    begin
      update public.profiles p
      set pseudo = clean,
          avatar = pic,
          tag = case when attempt = 1 then current_tag else 1000 + floor(random() * 9000)::int end,
          updated_at = now()
      where p.id = me;
      return private.card(me);
    exception when unique_violation then
    end;
  end loop;
  raise exception 'pseudo unavailable';
end;
$$;

-- Hidden profiles can't be found by a friend request.
create or replace function public.send_friend_request(secret text, pseudo text, tag integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
  other uuid;
  link public.friend_links;
  lo uuid;
  hi uuid;
begin
  perform private.hit('send_friend_request', 60);
  select p.id into other from public.profiles p
  where lower(p.pseudo) = lower(btrim(send_friend_request.pseudo)) and p.tag = send_friend_request.tag and not p.hidden;
  if other is null then
    raise exception 'player not found';
  end if;
  if other = me then
    raise exception 'cannot add yourself';
  end if;
  lo := least(me, other);
  hi := greatest(me, other);
  select * into link from public.friend_links fl where fl.a = lo and fl.b = hi;
  if link.status = 'accepted' then
    return 'already_friends';
  end if;
  if link.status = 'pending' and link.requester = other then
    update public.friend_links fl set status = 'accepted', updated_at = now() where fl.a = lo and fl.b = hi;
    return 'accepted';
  end if;
  insert into public.friend_links (a, b, requester, status) values (lo, hi, me, 'pending')
  on conflict on constraint friend_links_pkey do update set requester = me, status = 'pending', updated_at = now();
  return 'pending';
end;
$$;

-- Reports a player (inappropriate pseudo or avatar) and ends the link with them.
create or replace function public.report_player(secret text, other uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  perform private.hit('report_player', 20);
  if other = me then
    return;
  end if;
  insert into public.player_reports (reporter, reported, reason) values (me, other, left(coalesce(reason, 'pseudo'), 40))
  on conflict do nothing;
  update public.friend_links fl set status = 'removed', updated_at = now()
  where fl.a = least(me, other) and fl.b = greatest(me, other);
  if (select count(*) from public.player_reports r where r.reported = other) >= 3 then
    update public.profiles p set hidden = true where p.id = other;
  end if;
end;
$$;

revoke all on function public.report_player(text, uuid, text) from public;
grant execute on function public.report_player(text, uuid, text) to anon, authenticated;
