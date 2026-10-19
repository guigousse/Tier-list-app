-- Three abuses found by the audit of 2026-10-17. Test: supabase/tests/abuse_limits.sql.
--
-- 1. Sandbox purchases (TestFlight builds and Apple's review, free) credited the real
--    wallet without limit: 2000 credits a month at most per wallet now. Real purchases
--    aren't touched.
-- 2. Three reports hid a profile, even from three accounts made the same minute by the
--    same person. A report now counts towards hiding only from a profile older than three
--    days that heard from the reported player (a friend request or a tier list from them).
-- 3. Moderation read Cyrillic and full-width look-alikes as other letters: "сon" with a
--    Cyrillic с passed. Texts are now brought back to Latin before the banned words are
--    looked for, and pseudos take the Latin alphabet only (accents included).

create or replace function public.wallet_purchase(secret text, transaction_id text, product_id text, credits integer, environment text)
 returns table(balance integer, credited boolean)
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  w uuid := private.wallet_of(secret);
  added boolean := false;
  pay integer;
begin
  if w is null then
    raise exception 'unknown wallet';
  end if;
  if credits is null or credits <= 0 then
    raise exception 'invalid amount';
  end if;
  if wallet_purchase.environment = 'Sandbox'
     and not exists (select 1 from public.credit_purchases cp where cp.transaction_id = wallet_purchase.transaction_id)
     and (select coalesce(sum(cp.credits), 0) from public.credit_purchases cp
          where cp.wallet_id = w and cp.environment = 'Sandbox' and cp.created_at > now() - interval '30 days')
         + wallet_purchase.credits > 2000 then
    raise exception 'sandbox limit';
  end if;
  insert into public.credit_purchases (transaction_id, wallet_id, product_id, credits, environment)
  values (wallet_purchase.transaction_id, w, wallet_purchase.product_id, wallet_purchase.credits, wallet_purchase.environment)
  on conflict do nothing;
  if found then
    select least(cw.debt, wallet_purchase.credits) into pay from public.credit_wallets cw where cw.id = w for update;
    update public.credit_wallets cw
    set balance = cw.balance + wallet_purchase.credits - pay, debt = cw.debt - pay
    where cw.id = w;
    insert into public.credit_ledger (wallet_id, delta, reason) values (w, wallet_purchase.credits - pay, 'purchase ' || wallet_purchase.product_id);
    added := true;
  end if;
  return query select cw.balance, added from public.credit_wallets cw where cw.id = w;
end;
$$;

create or replace function public.report_player(secret text, other uuid, reason text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
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
  -- Reports that count: from established players the reported one reached out to.
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
$$;

-- Look-alike letters back to Latin: full-width and other compatibility forms by NFKC,
-- then the Cyrillic and Greek letters drawn like Latin ones.
create or replace function private."normalize"(t text)
 returns text
 language sql
 immutable
 set search_path to ''
as $$
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
$$;

-- Pseudos: Latin letters (accents and œ included), digits, space, _ . -
create or replace function private.clean_pseudo(pseudo text)
 returns text
 language plpgsql
 stable
 set search_path to ''
as $$
declare
  p text := regexp_replace(btrim(clean_pseudo.pseudo), '\s+', ' ', 'g');
begin
  if p !~ '^[A-Za-z0-9À-ÖØ-öø-ÿŒœ _.-]{2,20}$' then
    raise exception 'invalid pseudo';
  end if;
  if private.is_offensive(p) or private.has_contact(p, true) then
    raise exception 'pseudo refused';
  end if;
  return p;
end;
$$;
