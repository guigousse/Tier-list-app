-- A tier list sent to a friend expires after 7 days without an answer: it leaves both
-- mailboxes at once, can no longer be ranked, and is deleted by the daily cleanup. One
-- the friend ranked stays 90 days, as the privacy policy says (that purge, written in
-- 20261017010000_list_mail_purge.sql, wasn't in the cleanup run online).

-- Ranked, or sent less than 7 days ago (ignored or reported ones stay "pending" for the
-- sender until then, so they don't learn of it).
create or replace function private.mail_live(status text, created_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select status = 'ranked' or created_at > now() - interval '7 days';
$$;

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
          'sent_at', m.created_at, 'answered_at', m.answered_at, 'auto', m.answered_at = m.created_at,
          'sender_ranks', case when m.status = 'ranked' then to_jsonb(m.sender_ranks) end,
          'recipient_ranks', to_jsonb(m.recipient_ranks))
        order by m.created_at desc)
      from public.list_mail m
      where m.recipient = me and m.status in ('sent', 'ranked') and m.created_at > now() - interval '90 days'
        and private.mail_live(m.status, m.created_at)
        and not private.is_blocked(m.sender, me)), '[]'::jsonb),
    'outbox', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', m.id, 'to', private.card(m.recipient), 'payload', m.payload,
          'status', case when m.status = 'ranked' then 'ranked' else 'sent' end,
          'sent_at', m.created_at, 'answered_at', m.answered_at, 'seen', m.sender_seen, 'auto', m.answered_at = m.created_at,
          'sender_ranks', to_jsonb(m.sender_ranks),
          'recipient_ranks', case when m.status = 'ranked' then to_jsonb(m.recipient_ranks) end)
        order by m.created_at desc)
      from public.list_mail m
      where m.sender = me and m.created_at > now() - interval '90 days'
        and private.mail_live(m.status, m.created_at)), '[]'::jsonb)
  );
end;
$$;

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
  if not private.mail_live(m.status, m.created_at) then
    raise exception 'mail expired';
  end if;
  tiers := jsonb_array_length(m.payload->'r');
  if coalesce(array_length(ranks, 1), 0) <> jsonb_array_length(m.payload->'c')
     or exists (select 1 from unnest(ranks) r where r is null or r < 0 or r >= tiers) then
    raise exception 'invalid ranking';
  end if;
  update public.list_mail lm set status = 'ranked', recipient_ranks = ranks, answered_at = now(), sender_seen = false where lm.id = mail;
end;
$$;

-- An expired list can be sent again to the same friend.
create or replace function public.mail_sent_to(secret text, payload jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
  hash text := md5(private.mail_payload(payload)::text);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('friend', m.recipient, 'mail', m.id, 'status', case when m.status = 'ranked' then 'ranked' else 'sent' end))
    from public.list_mail m
    where m.sender = me and m.content_hash = hash and m.created_at > now() - interval '90 days'
      and private.mail_live(m.status, m.created_at)
  ), '[]'::jsonb);
end;
$$;

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
  hash text;
  ranks smallint[];
  earlier smallint[];
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
  clean := private.mail_payload(payload);
  hash := md5(clean::text);
  select array_agg(
      case when (c->>2) ~ '^\d{1,2}$' and (c->>2)::int < tiers then (c->>2)::smallint else -1::smallint end
      order by i)
    into ranks
    from jsonb_array_elements(payload->'c') with ordinality x(c, i);

  foreach friend in array (select array_agg(distinct r) from unnest(recipients) r) loop
    continue when friend = me;
    continue when not exists (
      select 1 from public.friend_links fl
      where fl.a = least(me, friend) and fl.b = greatest(me, friend) and fl.status = 'accepted'
    );
    continue when private.is_blocked(me, friend);
    continue when exists (
      select 1 from public.list_mail m
      where m.sender = me and m.recipient = friend and m.content_hash = hash and m.created_at > now() - interval '90 days'
        and private.mail_live(m.status, m.created_at)
    );
    continue when (select count(*) from public.list_mail m where m.sender = me and m.recipient = friend and m.created_at > now() - interval '1 day') >= 10;
    select m.recipient_ranks into earlier from public.list_mail m
    where m.recipient = friend and m.content_hash = hash and m.status = 'ranked'
    order by m.answered_at desc limit 1;
    if earlier is not null then
      insert into public.list_mail (sender, recipient, payload, content_hash, sender_ranks, recipient_ranks, status, answered_at, sender_seen)
      values (me, friend, clean, hash, ranks, earlier, 'ranked', now(), false);
    else
      insert into public.list_mail (sender, recipient, payload, content_hash, sender_ranks) values (me, friend, clean, hash, ranks);
    end if;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

create or replace function private.cleanup()
returns void
language sql
set search_path = ''
as $$
  delete from public.shared_lists where coalesce(last_opened_at, created_at) < now() - interval '180 days';
  -- Unanswered (or ignored) after 7 days; kept for moderation when reported.
  delete from public.list_mail where status in ('sent', 'ignored') and created_at < now() - interval '7 days';
  delete from public.list_mail where created_at < now() - interval '90 days';
  delete from private.rate_limits where window_start < now() - interval '1 day';
$$;
