-- Blocking players, and deleting one's profile (App Store guidelines 1.2 and 5.1.1(v)).
--
-- Blocks: a player can block another. It ends their link, and neither can send the
-- other a friend request until it is lifted. Reporting a player also blocks them.
-- A declined request can't be sent again by the same player for 7 days.
-- Deleting a profile removes it with its links, blocks and reports (cascade), and
-- the votes, views and favourites made with its device id.

create table public.player_blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
alter table public.player_blocks enable row level security;

-- Whether one of the two players blocked the other.
create or replace function private.is_blocked(x uuid, y uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.player_blocks pb
    where (pb.blocker = x and pb.blocked = y) or (pb.blocker = y and pb.blocked = x)
  );
$$;

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
  if exists (select 1 from public.player_blocks pb where pb.blocker = me and pb.blocked = other) then
    raise exception 'player blocked';
  end if;
  -- Blocked by them: answer as if they didn't exist.
  if exists (select 1 from public.player_blocks pb where pb.blocker = other and pb.blocked = me) then
    raise exception 'player not found';
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
  -- Declined lately: don't show it to them again.
  if link.status = 'declined' and link.requester = me and link.updated_at > now() - interval '7 days' then
    return 'pending';
  end if;
  insert into public.friend_links (a, b, requester, status) values (lo, hi, me, 'pending')
  on conflict on constraint friend_links_pkey do update set requester = me, status = 'pending', updated_at = now();
  return 'pending';
end;
$$;

-- Blocks a player and ends the link with them.
create or replace function public.block_player(secret text, other uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  perform private.hit('block_player', 60);
  if other = me then
    return;
  end if;
  insert into public.player_blocks (blocker, blocked) values (me, other) on conflict do nothing;
  update public.friend_links fl set status = 'removed', updated_at = now()
  where fl.a = least(me, other) and fl.b = greatest(me, other);
end;
$$;

create or replace function public.unblock_player(secret text, other uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  perform private.hit('unblock_player', 60);
  delete from public.player_blocks pb where pb.blocker = me and pb.blocked = other;
end;
$$;

-- Reports a player (inappropriate pseudo or avatar) and blocks them.
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
  insert into public.player_blocks (blocker, blocked) values (me, other) on conflict do nothing;
  update public.friend_links fl set status = 'removed', updated_at = now()
  where fl.a = least(me, other) and fl.b = greatest(me, other);
  if (select count(*) from public.player_reports r where r.reported = other) >= 3 then
    update public.profiles p set hidden = true where p.id = other;
  end if;
end;
$$;

-- This player's profile, friends, requests received and sent, and players blocked.
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
      from public.friend_links fl where (fl.a = me or fl.b = me) and fl.status = 'pending' and fl.requester <> me
        and not private.is_blocked(fl.a, fl.b)), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(private.card(case when fl.a = me then fl.b else fl.a end) order by fl.updated_at desc)
      from public.friend_links fl where (fl.a = me or fl.b = me) and fl.status = 'pending' and fl.requester = me
        and not private.is_blocked(fl.a, fl.b)), '[]'::jsonb),
    'blocked', coalesce((
      select jsonb_agg(private.card(pb.blocked) order by pb.created_at desc)
      from public.player_blocks pb where pb.blocker = me), '[]'::jsonb)
  );
end;
$$;

-- Deletes this player's profile and everything linked to it.
create or replace function public.delete_profile(secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
  device uuid;
begin
  perform private.hit('delete_profile', 10);
  select p.device_id into device from public.profiles p where p.id = me;
  delete from public.daily_votes dv where dv.device_id = device;
  delete from public.list_votes lv where lv.device_id = device;
  delete from public.template_views tv where tv.device_id = device;
  delete from public.template_favorites tf where tf.device_id = device;
  delete from public.profiles p where p.id = me;
end;
$$;

revoke all on function private.is_blocked(uuid, uuid) from public;
revoke all on function public.send_friend_request(text, text, integer) from public;
revoke all on function public.block_player(text, uuid) from public;
revoke all on function public.unblock_player(text, uuid) from public;
revoke all on function public.report_player(text, uuid, text) from public;
revoke all on function public.get_friends(text) from public;
revoke all on function public.delete_profile(text) from public;
grant execute on function public.send_friend_request(text, text, integer) to anon, authenticated;
grant execute on function public.block_player(text, uuid) to anon, authenticated;
grant execute on function public.unblock_player(text, uuid) to anon, authenticated;
grant execute on function public.report_player(text, uuid, text) to anon, authenticated;
grant execute on function public.get_friends(text) to anon, authenticated;
grant execute on function public.delete_profile(text) to anon, authenticated;
