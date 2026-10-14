-- Push notifications to friends, sent by the database through Expo's push service
-- (pg_net, asynchronous: a vote or a list never waits for it).
--
-- - A friend ranked a popular or daily tier list the player ranked too: how much
--   they agree, with a ⚔️ when they mostly don't.
-- - A friend sent the player a tier list.
-- - A friend ranked a tier list the player sent them.
--
-- The app registers its Expo push token on the profile (set_push_token); none: no
-- notification. Tapping one opens the comparison (data.type 'friend_vote' or 'mail').

create extension if not exists pg_net with schema extensions;

alter table public.profiles add column push_token text;

-- Titles of the built-in popular tier lists (the app's own templates), for notifications.
create table private.builtin_titles (
  key text primary key,
  title text not null
);
insert into private.builtin_titles (key, title) values
  ('mobile-games', 'Jeux mobiles'), ('fruits', 'Fruits'), ('desserts', 'Desserts'), ('animals', 'Animaux'),
  ('sports', 'Sports'), ('seasons', 'Saisons & fêtes'), ('food', 'Plats'), ('vegetables', 'Légumes'),
  ('drinks', 'Boissons'), ('cheeses', 'Fromages'), ('breakfast', 'Petit-déjeuner'), ('destinations', 'Destinations'),
  ('boardgames', 'Jeux de société'), ('movie-genres', 'Genres de films'), ('music-genres', 'Styles de musique'),
  ('instruments', 'Instruments'), ('transport', 'Transports'), ('superpowers', 'Super-pouvoirs'),
  ('weekend', 'Activités du week-end'), ('school', 'Matières scolaires')
on conflict do nothing;

-- Registers (or removes, with null) this install's Expo push token.
create or replace function public.set_push_token(secret text, token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  perform private.hit('set_push_token', 30);
  if token is not null and token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,64}\]$' then
    raise exception 'invalid token';
  end if;
  -- A phone belongs to one profile: another one that had this token loses it.
  if token is not null then
    update public.profiles p set push_token = null where p.push_token = token and p.id <> me;
  end if;
  update public.profiles p set push_token = token where p.id = me;
end;
$$;

-- Sends a notification to a player, if they registered a token. Never fails.
create or replace function private.push(player uuid, title text, body text, data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  select p.push_token into token from public.profiles p where p.id = player and not p.hidden;
  if token is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := jsonb_build_object('to', token, 'title', title, 'body', body, 'data', data, 'sound', 'default'),
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
  );
exception when others then
  -- Notifications are a bonus: a vote or a list never fails because of them.
  null;
end;
$$;

-- Agreement between two rankings on `tiers` tiers, from 0 to 100 (cards unranked on either side skipped).
create or replace function private.agreement(a smallint[], b smallint[], tiers integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(round(avg(1 - abs(x - y)::numeric / greatest(tiers - 1, 1)) * 100)::integer, 0)
  from unnest(a, b) as u(x, y)
  where x >= 0 and y >= 0;
$$;

-- Title of a tier list by vote key: popular:<template>:<hash> or daily:<day>.
create or replace function private.list_title(key text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    case
      -- list_title.key: the parameter, not the tables' key column.
      when list_title.key like 'daily:%' then (select d.title from public.daily_lists d where d.day::text = substr(list_title.key, 7))
      else coalesce(
        (select t.title from public.templates t where t.key = split_part(list_title.key, ':', 2)),
        (select b.title from private.builtin_titles b where b.key = split_part(list_title.key, ':', 2)))
    end,
    'une tier list');
$$;

-- The notification for "friend ranked a list you ranked too": title and body.
create or replace function private.agreement_message(pseudo text, list_title text, score integer)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when score < 60 then array[
      pseudo || ' n’est pas d’accord avec vous ⚔️',
      pseudo || ' a classé « ' || list_title || ' » : seulement ' || score || ' % d’accord. Voyez qui a raison !']
    when score >= 85 then array[
      pseudo || ' est d’accord avec vous 🤝',
      pseudo || ' a classé « ' || list_title || ' » : ' || score || ' % d’accord.']
    else array[
      pseudo || ' a classé « ' || list_title || ' »',
      score || ' % d’accord avec vous. Comparez vos classements !']
  end;
$$;

-- A player ranked a popular or daily tier list: their friends who ranked it too are told.
create or replace function private.notify_friend_vote(voter_device uuid, vote_key text, ranks smallint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  voter public.profiles;
  friend record;
  msg text[];
  title text;
begin
  select * into voter from public.profiles p where p.device_id = voter_device;
  if voter.id is null or voter.hidden then
    return;
  end if;
  title := private.list_title(vote_key);
  for friend in
    select p.id, coalesce(lv.ranks, dv.ranks) as their_ranks
    from public.friend_links fl
    join public.profiles p on p.id = case when fl.a = voter.id then fl.b else fl.a end
    left join public.list_votes lv on vote_key not like 'daily:%' and lv.list_key = vote_key and lv.device_id = p.device_id
    left join public.daily_votes dv on vote_key like 'daily:%' and dv.day::text = substr(vote_key, 7) and dv.device_id = p.device_id
    where (fl.a = voter.id or fl.b = voter.id) and fl.status = 'accepted' and p.push_token is not null
      and coalesce(lv.ranks, dv.ranks) is not null and not private.is_blocked(voter.id, p.id)
  loop
    msg := private.agreement_message(voter.pseudo, title, private.agreement(ranks, friend.their_ranks, 5));
    perform private.push(friend.id, msg[1], msg[2], jsonb_build_object('type', 'friend_vote', 'friend', voter.id, 'key', vote_key));
  end loop;
exception when others then
  null;
end;
$$;

create or replace function private.on_list_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.list_key like 'popular:%' then
    perform private.notify_friend_vote(new.device_id, new.list_key, new.ranks);
  end if;
  return null;
end;
$$;

create or replace function private.on_daily_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_friend_vote(new.device_id, 'daily:' || new.day::text, new.ranks);
  return null;
end;
$$;

-- Tier lists between friends: received, and ranked.
create or replace function private.on_mail()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_pseudo text := (select p.pseudo from public.profiles p where p.id = new.sender);
  recipient_pseudo text := (select p.pseudo from public.profiles p where p.id = new.recipient);
  list_title text := new.payload->>'t';
  score integer;
  msg text[];
  data jsonb := jsonb_build_object('type', 'mail', 'id', new.id);
begin
  if tg_op = 'INSERT' then
    perform private.push(new.recipient, sender_pseudo || ' vous a envoyé une tier list 📬',
      case when new.status = 'ranked' then '« ' || list_title || ' » : vous l’aviez déjà classée, comparez vos classements !'
           else '« ' || list_title || ' » : classez-la et comparez vos goûts.' end,
      data);
  end if;
  if new.status = 'ranked' and (tg_op = 'INSERT' or old.status is distinct from 'ranked') then
    score := private.agreement(new.sender_ranks, new.recipient_ranks, jsonb_array_length(new.payload->'r'));
    msg := private.agreement_message(recipient_pseudo, list_title, score);
    perform private.push(new.sender, msg[1], msg[2], data);
  end if;
  return null;
exception when others then
  return null;
end;
$$;

create trigger list_votes_notify after insert on public.list_votes for each row execute function private.on_list_vote();
create trigger daily_votes_notify after insert on public.daily_votes for each row execute function private.on_daily_vote();
create trigger list_mail_notify after insert or update of status on public.list_mail for each row execute function private.on_mail();

revoke all on function public.set_push_token(text, text) from public;
revoke all on function private.push(uuid, text, text, jsonb) from public;
revoke all on function private.notify_friend_vote(uuid, text, smallint[]) from public;
grant execute on function public.set_push_token(text, text) to anon, authenticated;
