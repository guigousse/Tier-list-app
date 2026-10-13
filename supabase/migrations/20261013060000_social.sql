-- Player profiles and friends.
--
-- No accounts: each install creates a profile with a random secret that only it
-- knows (the database keeps its SHA-256). Every social function takes that secret.
-- device_id links the profile to the install's votes (daily_votes, list_votes), so
-- friends can see each other's completed tier lists; it is never returned.

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null unique,
  secret_hash text not null unique,
  pseudo text not null check (char_length(pseudo) between 2 and 20),
  tag smallint not null check (tag between 1000 and 9999),
  avatar text not null check (char_length(avatar) between 1 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_pseudo_tag on public.profiles (lower(pseudo), tag);
alter table public.profiles enable row level security;

-- One row per pair of players (a < b). status: pending (asked by requester),
-- accepted, declined or removed.
create table public.friend_links (
  a uuid not null references public.profiles (id) on delete cascade,
  b uuid not null references public.profiles (id) on delete cascade,
  requester uuid not null,
  status text not null check (status in ('pending', 'accepted', 'declined', 'removed')),
  updated_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
alter table public.friend_links enable row level security;

-- Profile id for a secret, or an error.
create or replace function private.me(secret text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found uuid;
begin
  select p.id into found from public.profiles p where p.secret_hash = encode(sha256(convert_to(me.secret, 'UTF8')), 'hex');
  if found is null then
    raise exception 'unknown profile';
  end if;
  return found;
end;
$$;

-- Trimmed pseudo, or an error if it isn't 2 to 20 letters, digits, spaces, "_", "-" or ".".
create or replace function private.clean_pseudo(pseudo text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  p text := regexp_replace(btrim(clean_pseudo.pseudo), '\s+', ' ', 'g');
begin
  if p !~ '^[[:alnum:] _.-]{2,20}$' then
    raise exception 'invalid pseudo';
  end if;
  return p;
end;
$$;

-- Public part of a profile.
create or replace function private.card(profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'pseudo', p.pseudo, 'tag', p.tag, 'avatar', p.avatar,
    'completed',
      (select count(*) from public.list_votes lv where lv.device_id = p.device_id and lv.list_key like 'popular:%')
      + (select count(*) from public.daily_votes dv where dv.device_id = p.device_id)
  )
  from public.profiles p where p.id = profile_id;
$$;

-- Creates this install's profile and returns it, with its tag (the number after the pseudo).
create or replace function public.create_profile(device_id uuid, secret text, pseudo text, avatar text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := private.clean_pseudo(pseudo);
  new_id uuid;
begin
  perform private.hit('create_profile', 10);
  if char_length(secret) < 32 then
    raise exception 'invalid secret';
  end if;
  for attempt in 1..30 loop
    insert into public.profiles (device_id, secret_hash, pseudo, tag, avatar)
    values (create_profile.device_id, encode(sha256(convert_to(secret, 'UTF8')), 'hex'), clean, 1000 + floor(random() * 9000)::int, avatar)
    on conflict do nothing
    returning id into new_id;
    if new_id is not null then
      return private.card(new_id);
    end if;
    -- A profile for this install already exists: same secret, return it.
    if exists (select 1 from public.profiles p where p.device_id = create_profile.device_id) then
      return private.card(private.me(secret));
    end if;
  end loop;
  raise exception 'pseudo unavailable';
end;
$$;

-- Changes the pseudo or avatar. The tag stays unless the new pseudo needs another one.
create or replace function public.update_profile(secret text, pseudo text, avatar text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
  clean text := private.clean_pseudo(pseudo);
  current_tag smallint;
begin
  perform private.hit('update_profile', 30);
  select p.tag into current_tag from public.profiles p where p.id = me;
  for attempt in 1..30 loop
    begin
      update public.profiles p
      set pseudo = clean,
          avatar = update_profile.avatar,
          tag = case when attempt = 1 then current_tag else 1000 + floor(random() * 9000)::int end,
          updated_at = now()
      where p.id = me;
      return private.card(me);
    exception when unique_violation then
      -- Pseudo and tag taken: try another tag.
    end;
  end loop;
  raise exception 'pseudo unavailable';
end;
$$;

-- Asks a player for friendship ("Pseudo" and tag). Returns pending, accepted (they
-- had asked too) or already_friends.
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
  select p.id into other from public.profiles p where lower(p.pseudo) = lower(btrim(send_friend_request.pseudo)) and p.tag = send_friend_request.tag;
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

-- Accepts or declines a request received from `other`.
create or replace function public.respond_friend_request(secret text, other uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  update public.friend_links fl
  set status = case when accept then 'accepted' else 'declined' end, updated_at = now()
  where fl.a = least(me, other) and fl.b = greatest(me, other) and fl.status = 'pending' and fl.requester = other;
end;
$$;

-- Ends a friendship, or cancels a request sent.
create or replace function public.remove_friend(secret text, other uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  update public.friend_links fl set status = 'removed', updated_at = now()
  where fl.a = least(me, other) and fl.b = greatest(me, other);
end;
$$;

-- This player's profile, friends, and requests received and sent.
create or replace function public.get_friends(secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  return jsonb_build_object(
    'me', private.card(me),
    'friends', coalesce((
      select jsonb_agg(private.card(case when fl.a = me then fl.b else fl.a end) order by fl.updated_at desc)
      from public.friend_links fl where (fl.a = me or fl.b = me) and fl.status = 'accepted'), '[]'::jsonb),
    'incoming', coalesce((
      select jsonb_agg(private.card(fl.requester) order by fl.updated_at desc)
      from public.friend_links fl where (fl.a = me or fl.b = me) and fl.status = 'pending' and fl.requester <> me), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(private.card(case when fl.a = me then fl.b else fl.a end) order by fl.updated_at desc)
      from public.friend_links fl where (fl.a = me or fl.b = me) and fl.status = 'pending' and fl.requester = me), '[]'::jsonb)
  );
end;
$$;

-- A friend's profile and validated rankings: popular tier lists (key = list_key)
-- and daily tier lists (key = "daily:YYYY-MM-DD"), newest first.
create or replace function public.get_friend_lists(secret text, friend uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
  device uuid;
begin
  if not exists (
    select 1 from public.friend_links fl
    where fl.a = least(me, friend) and fl.b = greatest(me, friend) and fl.status = 'accepted'
  ) then
    raise exception 'not friends';
  end if;
  select p.device_id into device from public.profiles p where p.id = friend;
  return jsonb_build_object(
    'profile', private.card(friend),
    'votes', coalesce((
      select jsonb_agg(v order by v->>'at' desc) from (
        select jsonb_build_object('key', lv.list_key, 'ranks', lv.ranks, 'at', lv.updated_at) v
        from public.list_votes lv where lv.device_id = device and lv.list_key like 'popular:%'
        union all
        select jsonb_build_object('key', 'daily:' || dv.day, 'ranks', dv.ranks, 'at', dv.created_at)
        from public.daily_votes dv where dv.device_id = device
      ) s), '[]'::jsonb)
  );
end;
$$;

-- Completed rankings and favourites of every popular tier list. Rankings of a past
-- daily tier list made on its day count for its popular version ("daily-YYYY-MM-DD").
create or replace function public.get_template_stats_v2()
returns table (template_key text, completions bigint, favorites bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with c as (
    select k, sum(n)::bigint as n from (
      select split_part(lv.list_key, ':', 2) as k, count(*) as n from public.list_votes lv where lv.list_key like 'popular:%' group by 1
      union all
      select 'daily-' || dv.day, count(*) from public.daily_votes dv group by dv.day
    ) s group by k
  ),
  f as (select tf.template_key as k, count(*) as n from public.template_favorites tf where tf.active group by tf.template_key)
  select coalesce(c.k, f.k), coalesce(c.n, 0), coalesce(f.n, 0) from c full join f on f.k = c.k;
$$;

revoke all on function public.create_profile(uuid, text, text, text) from public;
revoke all on function public.update_profile(text, text, text) from public;
revoke all on function public.send_friend_request(text, text, integer) from public;
revoke all on function public.respond_friend_request(text, uuid, boolean) from public;
revoke all on function public.remove_friend(text, uuid) from public;
revoke all on function public.get_friends(text) from public;
revoke all on function public.get_friend_lists(text, uuid) from public;
revoke all on function public.get_template_stats_v2() from public;
grant execute on function public.create_profile(uuid, text, text, text) to anon, authenticated;
grant execute on function public.update_profile(text, text, text) to anon, authenticated;
grant execute on function public.send_friend_request(text, text, integer) to anon, authenticated;
grant execute on function public.respond_friend_request(text, uuid, boolean) to anon, authenticated;
grant execute on function public.remove_friend(text, uuid) to anon, authenticated;
grant execute on function public.get_friends(text) to anon, authenticated;
grant execute on function public.get_friend_lists(text, uuid) to anon, authenticated;
grant execute on function public.get_template_stats_v2() to anon, authenticated;
