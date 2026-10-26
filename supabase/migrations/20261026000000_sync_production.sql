-- Brings the repository back in line with production (2026-10-26).
--
-- Some functions were changed in production without their migration, or with an older
-- version of it: below are their definitions exactly as production runs them, so that a
-- database rebuilt from these migrations (a branch, a restore) behaves the same. On
-- production itself this migration changes nothing.

create or replace function private.ad_credit(ticket text, transaction_id text)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.ad_tickets;
begin
  if transaction_id is null or transaction_id = '' then
    return 'unknown';
  end if;
  if exists (select 1 from public.ad_rewards a where a.transaction_id = ad_credit.transaction_id) then
    return 'already';
  end if;
  select * into k from public.ad_tickets t where t.ticket = ad_credit.ticket for update;
  if not found then
    return 'unknown';
  end if;
  if k.used_at is not null then
    return 'used';
  end if;
  if k.expires_at < now() then
    return 'expired';
  end if;
  perform 1 from public.credit_wallets w where w.id = k.wallet_id for update;
  if private.ad_next_at(k.wallet_id) is not null then
    return 'week';
  end if;
  begin
    insert into public.ad_rewards (wallet_id, transaction_id) values (k.wallet_id, ad_credit.transaction_id);
  exception when unique_violation then
    return 'already';
  end;
  update public.ad_tickets t set used_at = now() where t.ticket = k.ticket;
  perform public.wallet_grant(k.wallet_id, 5, 'ad:' || ad_credit.transaction_id);
  return 'credited';
end;
$function$;

create or replace function private.eur_per_usd()
 returns numeric
 language sql
 immutable
as $function$select 0.90$function$;

create or replace function private.worst_eur_per_credit()
 returns numeric
 language sql
 immutable
as $function$select round(19.99 / 1.2 * 0.85 / 1750, 6)$function$;

create or replace function private.list_title(key text)
 returns text
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(
    case
      when list_title.key like 'daily:%' then (select d.title from public.daily_lists d where d.day::text = substr(list_title.key, 7))
      else coalesce(
        (select t.title from public.templates t where t.key = split_part(list_title.key, ':', 2)),
        (select b.title from private.builtin_titles b where b.key = split_part(list_title.key, ':', 2)))
    end,
    'une tier list');
$function$;

create or replace function private."normalize"(t text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select regexp_replace(
    regexp_replace(
      translate(
        translate(
          translate(lower(pg_catalog.normalize(t, 'NFKC')),
            'аеорсухкмтвнізјԁһӏѕɡοαερτνικυχ', 'aeopcyxkmtbhi3jdhlsgoaeptvikux'),
          'àâäáãåāçćčéèêëēęíìîïīñńóòôöõøōúùûüūýÿœæß', 'aaaaaaaccceeeeeeiiiiinnooooooouuuuuyyoas'),
        '0134578@$!|€', 'oieastbasiie'),
      '[^a-z]+', ' ', 'g'),
    '([a-z])\1+', '\1', 'g');
$function$;

create or replace function private.on_vote_referral()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if exists (select 1 from public.referrals r where r.device_id = new.device_id and r.activated_at is null) then
    perform private.activate_referral(new.device_id);
  end if;
  return null;
exception when others then
  return null;
end;
$function$;

create or replace function private.push(player uuid, title text, body text, data jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
  null;
end;
$function$;

create or replace function public.ad_status(wallet text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  me uuid := private.wallet_of(ad_status.wallet);
  next_at timestamptz;
begin
  perform private.hit('ad_status', 120);
  if me is null then
    raise exception 'unknown wallet';
  end if;
  next_at := private.ad_next_at(me);
  return jsonb_build_object('available', next_at is null, 'next_at', next_at);
end;
$function$;

create or replace function public.claim_challenge(wallet text, device_id uuid, code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  me public.credit_wallets;
  sharer uuid;
begin
  perform private.hit('claim_challenge', 30);
  select * into me from public.credit_wallets w where w.id = private.wallet_of(claim_challenge.wallet);
  select s.creator_wallet into sharer from public.shared_lists s where s.code = upper(claim_challenge.code);
  if sharer is null then
    return jsonb_build_object('status', 'unknown');
  end if;
  if me.id = sharer then
    return jsonb_build_object('status', 'own');
  end if;
  if exists (select 1 from public.referrals r where r.referee_wallet = me.id or r.device_id = claim_challenge.device_id) then
    return jsonb_build_object('status', 'already');
  end if;
  if me.id is null or me.attest_key_id is null or me.created_at < now() - interval '7 days' then
    return jsonb_build_object('status', 'not_new');
  end if;
  if (select count(*) from public.referrals r where r.referrer_wallet = sharer) >= 10 then
    return jsonb_build_object('status', 'cap');
  end if;
  begin
    insert into public.referrals (referee_wallet, referrer_wallet, device_id, code, pending)
    values (me.id, sharer, claim_challenge.device_id, upper(claim_challenge.code), 5);
  exception when unique_violation then
    return jsonb_build_object('status', 'already');
  end;
  perform private.activate_referral(claim_challenge.device_id);
  return jsonb_build_object('status', 'credited');
end;
$function$;

create or replace function public.collect_referrals(wallet text)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  me uuid := private.wallet_of(collect_referrals.wallet);
  total integer;
begin
  perform private.hit('collect_referrals', 60);
  if me is null then
    return 0;
  end if;
  with old as (
    select r.referee_wallet, r.pending from public.referrals r
    where r.referrer_wallet = me and r.pending > 0 for update
  ), taken as (
    update public.referrals r set pending = 0 from old where r.referee_wallet = old.referee_wallet returning old.pending
  )
  select coalesce(sum(t.pending), 0)::integer into total from taken t;
  if total > 0 then
    perform public.wallet_grant(me, total, 'referrals');
  end if;
  return total;
end;
$function$;

create or replace function public.get_shared_list(code text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  result jsonb;
begin
  perform private.hit('open_share', 300);
  update public.shared_lists s set last_opened_at = now()
  where s.code = upper(get_shared_list.code)
  returning s.payload into result;
  return result;
end;
$function$;

create or replace function public.report_player(secret text, other uuid, reason text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
  if (select count(*) from public.player_reports r
      join public.profiles rp on rp.id = r.reporter
      where r.reported = other
        and rp.created_at < now() - interval '3 days'
        and (exists (select 1 from public.friend_links fl
                     where fl.a = least(r.reporter, other) and fl.b = greatest(r.reporter, other) and fl.requester = other)
             or exists (select 1 from public.list_mail m where m.sender = other and m.recipient = r.reporter))) >= 3 then
    update public.profiles p set hidden = true where p.id = other;
  end if;
end;
$function$;

create or replace function public.send_list(secret text, recipients uuid[], payload jsonb)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
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
$function$;

create or replace function public.set_push_token(secret text, token text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  me uuid := private.me(secret);
begin
  perform private.hit('set_push_token', 30);
  if token is not null and token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,64}\]$' then
    raise exception 'invalid token';
  end if;
  if token is not null then
    update public.profiles p set push_token = null where p.push_token = token and p.id <> me;
  end if;
  update public.profiles p set push_token = token where p.id = me;
end;
$function$;

create or replace function public.wallet_milestones(secret text, device_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  every constant integer := 25;
  amount constant integer := 5;
  w uuid := private.wallet_of(secret);
  completed integer;
  paid integer;
  b integer;
begin
  if w is null then
    raise exception 'unknown wallet';
  end if;
  if exists (select 1 from public.credit_wallets cw where cw.id = w and cw.attest_key_id is not null) then
    completed := private.public_lists_done(wallet_milestones.device_id);
    with steps as (
      insert into public.credit_milestones (wallet_id, device_id, at)
      select w, wallet_milestones.device_id, s.at
      from generate_series(every, (completed / every) * every, every) as s(at)
      on conflict do nothing
      returning at
    ), logged as (
      insert into public.credit_ledger (wallet_id, delta, reason)
      select w, amount, 'milestone:' || steps.at from steps
      returning delta
    )
    select coalesce(sum(delta), 0) into paid from logged;
    if paid > 0 then
      update public.credit_wallets set balance = balance + paid where id = w;
    end if;
  end if;
  select balance into b from public.credit_wallets where id = w;
  return b;
end;
$function$;

create or replace function public.wallet_refund(transaction_id text)
 returns table(taken integer, debt integer)
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p record;
  b integer;
  t integer;
begin
  update public.credit_purchases cp set refunded_at = now()
  where cp.transaction_id = wallet_refund.transaction_id and cp.refunded_at is null
  returning cp.wallet_id, cp.credits, cp.product_id into p;
  if p is null then
    return query select 0, coalesce((select w.debt from public.credit_wallets w join public.credit_purchases cp on cp.wallet_id = w.id where cp.transaction_id = wallet_refund.transaction_id), 0);
    return;
  end if;
  select w.balance into b from public.credit_wallets w where w.id = p.wallet_id for update;
  t := least(b, p.credits);
  update public.credit_wallets w
  set balance = w.balance - t,
      debt = w.debt + (p.credits - t),
      refunds_after_use = w.refunds_after_use + case when p.credits > t then 1 else 0 end
  where w.id = p.wallet_id;
  insert into public.credit_ledger (wallet_id, delta, reason) values (p.wallet_id, -t, 'refunded ' || p.product_id);
  return query select t, w.debt from public.credit_wallets w where w.id = p.wallet_id;
end;
$function$;
