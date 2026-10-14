-- Tier lists sent between friends, and safer friend codes.
--
-- Safety: pseudos can't carry contact details (phone numbers, @handles, links, social
-- network names), and texts of shared or sent tier lists can't carry offensive words
-- or contact details either. Friend requests are limited to 20 an hour, so friend
-- codes (pseudo#1234) can't be guessed by trying numbers.
--
-- Mail: a player sends one of their tier lists to friends (accepted, not blocked).
-- The friend gets its cards to rank, without the sender's ranking; once they rank
-- it, both see the two rankings side by side. A received list can be ignored, or
-- reported (which reports and blocks the sender). Mail older than 90 days isn't shown.

-- Contact details in a text. `strict`: also refuses social network names (pseudos),
-- which are fine as card labels ("Snapchat" in a tier list of apps).
create or replace function private.has_contact(t text, strict boolean)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(t), '[\s.\-_/()+]', '', 'g') ~ '\d{6,}'
    or lower(t) ~ '(@|https?:|www\.|\.(com|fr|net|org|io|me|gg)\y)'
    -- normalize() merges doubled letters: "whatsapp" → "whatsap", "facebook" → "facebok".
    or (strict and replace(private.normalize(t), ' ', '') ~ '(snap|insta|tiktok|whatsap|telegram|discord|twitch|youtube|facebok|telephone|numero)');
$$;

-- Pseudos: no contact details either.
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
  if private.is_offensive(p) or private.has_contact(p, true) then
    raise exception 'pseudo refused';
  end if;
  return p;
end;
$$;

-- Whether a tier list payload has offensive words or contact details in its title,
-- tier names or card labels.
create or replace function private.payload_refused(payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from (
      select payload->>'t' as txt
      union all select r->>0 from jsonb_array_elements(case when jsonb_typeof(payload->'r') = 'array' then payload->'r' else '[]'::jsonb end) r
      union all select c->>0 from jsonb_array_elements(case when jsonb_typeof(payload->'c') = 'array' then payload->'c' else '[]'::jsonb end) c
    ) texts
    where txt is not null and (private.is_offensive(txt) or private.has_contact(txt, false))
  );
$$;

create or replace function public.share_list(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
begin
  perform private.hit('share', 30);
  if jsonb_typeof(payload) <> 'object' or payload->>'v' is null
     or jsonb_typeof(payload->'r') <> 'array' or jsonb_typeof(payload->'c') <> 'array' then
    raise exception 'invalid tier list';
  end if;
  if pg_column_size(payload) > 65536 then
    raise exception 'tier list too large';
  end if;
  if private.payload_refused(payload) then
    raise exception 'content refused';
  end if;
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.shared_lists (code, payload) values (new_code, payload);
      return new_code;
    exception when unique_violation then
      -- Extremely rare: try another code.
    end;
  end loop;
end;
$$;

-- Same as before, limited to 20 requests an hour.
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
  perform private.hit('send_friend_request', 20);
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
  if link.status = 'declined' and link.requester = me and link.updated_at > now() - interval '7 days' then
    return 'pending';
  end if;
  insert into public.friend_links (a, b, requester, status) values (lo, hi, me, 'pending')
  on conflict on constraint friend_links_pkey do update set requester = me, status = 'pending', updated_at = now();
  return 'pending';
end;
$$;

create table public.list_mail (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.profiles (id) on delete cascade,
  recipient uuid not null references public.profiles (id) on delete cascade,
  -- The list without its ranking (every card's tier is -1), as the app shares them.
  payload jsonb not null,
  -- The sender's tier for each card (index in the payload's tiers, -1 if unranked).
  sender_ranks smallint[] not null,
  recipient_ranks smallint[],
  -- sent → ranked, or ignored / reported by the recipient.
  status text not null default 'sent' check (status in ('sent', 'ranked', 'ignored', 'reported')),
  -- Whether the sender saw the recipient's ranking.
  sender_seen boolean not null default true,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index list_mail_recipient on public.list_mail (recipient, created_at desc);
create index list_mail_sender on public.list_mail (sender, created_at desc);
alter table public.list_mail enable row level security;

-- Sends a tier list to friends. Returns how many got it.
create or replace function public.send_list(secret text, recipients uuid[], payload jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
  tiers integer;
  cards integer;
  clean jsonb;
  ranks smallint[];
  friend uuid;
  sent integer := 0;
begin
  perform private.hit('send_list', 30);
  if jsonb_typeof(payload) <> 'object' or jsonb_typeof(payload->'r') <> 'array' or jsonb_typeof(payload->'c') <> 'array'
     or jsonb_typeof(payload->'t') <> 'string' then
    raise exception 'invalid tier list';
  end if;
  tiers := jsonb_array_length(payload->'r');
  cards := jsonb_array_length(payload->'c');
  if tiers not between 1 and 30 or cards not between 1 and 100 or pg_column_size(payload) > 32768 then
    raise exception 'invalid tier list';
  end if;
  if coalesce(array_length(recipients, 1), 0) not between 1 and 20 then
    raise exception 'invalid recipients';
  end if;
  if private.payload_refused(payload) then
    raise exception 'content refused';
  end if;
  -- The friend ranks the cards themselves: the payload keeps no tier.
  select jsonb_build_object(
      'v', 1,
      't', left(payload->>'t', 60),
      'r', (select jsonb_agg(jsonb_build_array(left(r->>0, 50), left(r->>1, 9)) order by i) from jsonb_array_elements(payload->'r') with ordinality x(r, i)),
      'c', (select jsonb_agg(jsonb_build_array(left(c->>0, 80), left(c->>1, 9), -1) order by i) from jsonb_array_elements(payload->'c') with ordinality x(c, i))
    ),
    (select array_agg(
        case when (c->>2) ~ '^\d{1,2}$' and (c->>2)::int < tiers then (c->>2)::smallint else -1::smallint end
        order by i)
      from jsonb_array_elements(payload->'c') with ordinality x(c, i))
  into clean, ranks;

  foreach friend in array (select array_agg(distinct r) from unnest(recipients) r) loop
    continue when friend = me;
    continue when not exists (
      select 1 from public.friend_links fl
      where fl.a = least(me, friend) and fl.b = greatest(me, friend) and fl.status = 'accepted'
    );
    continue when private.is_blocked(me, friend);
    -- At most 10 lists a day to the same friend.
    continue when (select count(*) from public.list_mail m where m.sender = me and m.recipient = friend and m.created_at > now() - interval '1 day') >= 10;
    insert into public.list_mail (sender, recipient, payload, sender_ranks) values (me, friend, clean, ranks);
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- Lists received and sent in the last 90 days. The sender's ranking of a received
-- list only shows once it's ranked; ignored or reported lists stay "sent" for the sender.
create or replace function public.get_mail(secret text)
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
    'inbox', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', m.id, 'from', private.card(m.sender), 'payload', m.payload, 'status', m.status,
          'sent_at', m.created_at, 'answered_at', m.answered_at,
          'sender_ranks', case when m.status = 'ranked' then to_jsonb(m.sender_ranks) end,
          'recipient_ranks', to_jsonb(m.recipient_ranks))
        order by m.created_at desc)
      from public.list_mail m
      where m.recipient = me and m.status in ('sent', 'ranked') and m.created_at > now() - interval '90 days'
        and not private.is_blocked(m.sender, me)), '[]'::jsonb),
    'outbox', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', m.id, 'to', private.card(m.recipient), 'payload', m.payload,
          'status', case when m.status = 'ranked' then 'ranked' else 'sent' end,
          'sent_at', m.created_at, 'answered_at', m.answered_at, 'seen', m.sender_seen,
          'sender_ranks', to_jsonb(m.sender_ranks),
          'recipient_ranks', case when m.status = 'ranked' then to_jsonb(m.recipient_ranks) end)
        order by m.created_at desc)
      from public.list_mail m
      where m.sender = me and m.created_at > now() - interval '90 days'), '[]'::jsonb)
  );
end;
$$;

-- The recipient's ranking of a received list (tier index per card, every card ranked).
create or replace function public.answer_mail(secret text, mail uuid, ranks smallint[])
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
  perform private.hit('answer_mail', 60);
  select * into m from public.list_mail lm where lm.id = mail and lm.recipient = me;
  if m.id is null or m.status <> 'sent' then
    raise exception 'mail not found';
  end if;
  tiers := jsonb_array_length(m.payload->'r');
  if coalesce(array_length(ranks, 1), 0) <> jsonb_array_length(m.payload->'c')
     or exists (select 1 from unnest(ranks) r where r is null or r < 0 or r >= tiers) then
    raise exception 'invalid ranking';
  end if;
  update public.list_mail lm set status = 'ranked', recipient_ranks = ranks, answered_at = now(), sender_seen = false where lm.id = mail;
end;
$$;

create or replace function public.ignore_mail(secret text, mail uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  update public.list_mail lm set status = 'ignored' where lm.id = mail and lm.recipient = me and lm.status = 'sent';
end;
$$;

-- Reports a received list: the sender is reported (inappropriate list) and blocked.
create or replace function public.report_mail(secret text, mail uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
  from_player uuid;
begin
  select lm.sender into from_player from public.list_mail lm where lm.id = mail and lm.recipient = me;
  if from_player is null then
    raise exception 'mail not found';
  end if;
  update public.list_mail lm set status = 'reported' where lm.id = mail;
  perform public.report_player(secret, from_player, 'liste');
end;
$$;

-- The sender saw the friend's ranking of a list they sent.
create or replace function public.mark_mail_seen(secret text, mail uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  update public.list_mail lm set sender_seen = true where lm.id = mail and lm.sender = me;
end;
$$;

revoke all on function private.has_contact(text, boolean) from public;
revoke all on function private.payload_refused(jsonb) from public;
revoke all on function public.share_list(jsonb) from public;
revoke all on function public.send_friend_request(text, text, integer) from public;
revoke all on function public.send_list(text, uuid[], jsonb) from public;
revoke all on function public.get_mail(text) from public;
revoke all on function public.answer_mail(text, uuid, smallint[]) from public;
revoke all on function public.ignore_mail(text, uuid) from public;
revoke all on function public.report_mail(text, uuid) from public;
revoke all on function public.mark_mail_seen(text, uuid) from public;
grant execute on function public.share_list(jsonb) to anon, authenticated;
grant execute on function public.send_friend_request(text, text, integer) to anon, authenticated;
grant execute on function public.send_list(text, uuid[], jsonb) to anon, authenticated;
grant execute on function public.get_mail(text) to anon, authenticated;
grant execute on function public.answer_mail(text, uuid, smallint[]) to anon, authenticated;
grant execute on function public.ignore_mail(text, uuid) to anon, authenticated;
grant execute on function public.report_mail(text, uuid) to anon, authenticated;
grant execute on function public.mark_mail_seen(text, uuid) to anon, authenticated;
