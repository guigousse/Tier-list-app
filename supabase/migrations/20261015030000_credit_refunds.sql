-- Refunded packs (supabase/functions/ai-generate/refunds.ts, called by appstore-notify):
-- the credits of a pack Apple refunds are taken back. What is left of them leaves the
-- balance; what was already spent becomes a debt, paid first by the next purchase, since
-- the generations it paid for were made (and cost us). A wallet refunded twice after
-- spending can't start a generation any more ("blocked").

alter table public.credit_wallets
  add column debt integer not null default 0 check (debt >= 0),
  add column refunds_after_use integer not null default 0;
alter table public.credit_purchases add column refunded_at timestamptz;

-- The pack and the balance a refund request is about, for the answer to Apple.
create or replace function public.purchase_state(transaction_id text)
 returns table (credits integer, balance integer)
 language sql
 stable
 security definer
 set search_path to ''
as $$
  select p.credits, w.balance from public.credit_purchases p join public.credit_wallets w on w.id = p.wallet_id
  where p.transaction_id = purchase_state.transaction_id;
$$;

-- Takes back a refunded pack, once. Returns what was taken from the balance and the debt left.
create or replace function public.wallet_refund(transaction_id text)
 returns table (taken integer, debt integer)
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  p record;
  b integer;
  t integer;
begin
  update public.credit_purchases cp set refunded_at = now()
  where cp.transaction_id = wallet_refund.transaction_id and cp.refunded_at is null
  returning cp.wallet_id, cp.credits, cp.product_id into p;
  if p is null then
    -- Unknown, or already taken back: Apple sends a notification again until it gets a 200.
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
$$;

-- Apple cancels a refund (REFUND_REVERSED): the pack is given back, debt first.
create or replace function public.wallet_refund_reversed(transaction_id text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  p record;
  pay integer;
begin
  update public.credit_purchases cp set refunded_at = null
  where cp.transaction_id = wallet_refund_reversed.transaction_id and cp.refunded_at is not null
  returning cp.wallet_id, cp.credits, cp.product_id into p;
  if p is null then
    return;
  end if;
  select least(w.debt, p.credits) into pay from public.credit_wallets w where w.id = p.wallet_id for update;
  update public.credit_wallets w
  set debt = w.debt - pay,
      balance = w.balance + p.credits - pay,
      refunds_after_use = greatest(0, w.refunds_after_use - case when pay > 0 then 1 else 0 end)
  where w.id = p.wallet_id;
  insert into public.credit_ledger (wallet_id, delta, reason) values (p.wallet_id, p.credits - pay, 'refund reversed ' || p.product_id);
end;
$$;

-- Purchases pay the debt first.
create or replace function public.wallet_purchase(secret text, transaction_id text, product_id text, credits integer, environment text)
 returns table (balance integer, credited boolean)
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

-- A wallet refunded twice after spending its energy starts no more generations.
create or replace function public.wallet_hold(secret text, amount integer, reason text)
 returns bigint
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  w uuid := private.wallet_of(secret);
  hold bigint;
begin
  if w is null then
    raise exception 'unknown wallet';
  end if;
  if amount is null or amount <= 0 then
    raise exception 'invalid amount';
  end if;
  if (select refunds_after_use from public.credit_wallets where id = w) >= 2 then
    raise exception 'blocked';
  end if;
  perform private.release_stale(w);
  update public.credit_wallets set balance = balance - amount where id = w and balance >= amount;
  if not found then
    raise exception 'credits';
  end if;
  insert into public.credit_holds (wallet_id, amount, reason) values (w, amount, reason) returning id into hold;
  insert into public.credit_ledger (wallet_id, delta, reason, hold_id) values (w, -amount, reason, hold);
  return hold;
end;
$$;

revoke all on function public.purchase_state(text) from public, anon, authenticated;
revoke all on function public.wallet_refund(text) from public, anon, authenticated;
revoke all on function public.wallet_refund_reversed(text) from public, anon, authenticated;
grant execute on function public.purchase_state(text) to service_role;
grant execute on function public.wallet_refund(text) to service_role;
grant execute on function public.wallet_refund_reversed(text) to service_role;
