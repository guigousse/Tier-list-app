-- Fixes from the security audit of 2026-10-26.

-- A probe left over from testing request.headers (20261019010000_content_i18n_regions.sql).
drop function if exists public.tmp_probe_country();

-- Constants of the AI margin report: a fixed search_path like every other function.
alter function private.eur_per_usd() set search_path = '';
alter function private.worst_eur_per_credit() set search_path = '';

-- Free TestFlight purchases: 2000 credits a month per wallet was the only bound, and a
-- wallet is made for any new secret, so a tester could get 2000 more with each one. Now
-- also 5000 credits a day for all wallets together (the testers' busiest day so far:
-- 1990). The lock makes two purchases at once count one after the other.
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
     and not exists (select 1 from public.credit_purchases cp where cp.transaction_id = wallet_purchase.transaction_id) then
    perform pg_advisory_xact_lock(hashtext('tiercraft.sandbox_purchase'));
    if (select coalesce(sum(cp.credits), 0) from public.credit_purchases cp
        where cp.wallet_id = w and cp.environment = 'Sandbox' and cp.created_at > now() - interval '30 days')
       + wallet_purchase.credits > 2000
       or (select coalesce(sum(cp.credits), 0) from public.credit_purchases cp
           where cp.environment = 'Sandbox' and cp.created_at > now() - interval '1 day')
       + wallet_purchase.credits > 5000 then
      raise exception 'sandbox limit';
    end if;
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

-- 20261019030000_no_list_credits.sql never reached production: claim_list_credits still
-- paid 5 credits every 25 lists, from votes whose device id the app chooses. Applied now.
create or replace function public.wallet_milestones(secret text, device_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  w uuid := private.wallet_of(secret);
  b integer;
begin
  if w is null then
    raise exception 'unknown wallet';
  end if;
  select balance into b from public.credit_wallets where id = w;
  return b;
end;
$$;
