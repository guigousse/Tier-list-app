-- The same tier list sent again.
--
-- A list is "the same" when its title, tiers and cards are (content_hash, from the
-- list without ranking). Sending it again to a friend who already has it does
-- nothing (even if they ignored it); the app shows it as already sent. A friend who already ranked it (sent
-- by someone else) answers at once with that ranking: the comparison is ready
-- right away, and they can rank it again if they changed their mind.

alter table public.list_mail add column content_hash text;
update public.list_mail set content_hash = md5(payload::text) where content_hash is null;
alter table public.list_mail alter column content_hash set not null;
create index list_mail_hash on public.list_mail (recipient, content_hash);

-- A payload as sent to friends: no ranking, texts and colours cut to size.
create or replace function private.mail_payload(payload jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'v', 1,
    't', left(payload->>'t', 60),
    'r', (select jsonb_agg(jsonb_build_array(left(r->>0, 50), left(r->>1, 9)) order by i) from jsonb_array_elements(payload->'r') with ordinality x(r, i)),
    'c', (select jsonb_agg(jsonb_build_array(left(c->>0, 80), left(c->>1, 9), -1) order by i) from jsonb_array_elements(payload->'c') with ordinality x(c, i))
  );
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
    -- Already sent to this friend (even if they ignored it: no insisting).
    continue when exists (
      select 1 from public.list_mail m
      where m.sender = me and m.recipient = friend and m.content_hash = hash and m.created_at > now() - interval '90 days'
    );
    continue when (select count(*) from public.list_mail m where m.sender = me and m.recipient = friend and m.created_at > now() - interval '1 day') >= 10;
    -- Already ranked by this friend (sent by someone else): same answer, right away.
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

-- Friends this player already sent the same list to (in the last 90 days), and where it stands.
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
  ), '[]'::jsonb);
end;
$$;

-- Ranks a received list again (after an automatic answer, or a change of mind).
create or replace function public.rerank_mail(secret text, mail uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  perform private.hit('answer_mail', 60);
  update public.list_mail lm set status = 'sent', recipient_ranks = null, answered_at = null, sender_seen = true
  where lm.id = mail and lm.recipient = me and lm.status = 'ranked';
end;
$$;

-- Same as before, plus `auto`: answered at once with an earlier ranking.
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
      where m.sender = me and m.created_at > now() - interval '90 days'), '[]'::jsonb)
  );
end;
$$;

revoke all on function private.mail_payload(jsonb) from public;
revoke all on function public.send_list(text, uuid[], jsonb) from public;
revoke all on function public.mail_sent_to(text, jsonb) from public;
revoke all on function public.rerank_mail(text, uuid) from public;
revoke all on function public.get_mail(text) from public;
grant execute on function public.send_list(text, uuid[], jsonb) to anon, authenticated;
grant execute on function public.mail_sent_to(text, jsonb) to anon, authenticated;
grant execute on function public.rerank_mail(text, uuid) to anon, authenticated;
grant execute on function public.get_mail(text) to anon, authenticated;
