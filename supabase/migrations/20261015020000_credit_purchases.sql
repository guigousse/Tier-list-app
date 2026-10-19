-- Energy packs bought in the App Store. The ai-generate edge function checks Apple's
-- signature on the transaction (purchase.ts), then calls wallet_purchase: a transaction
-- is credited once, to one wallet, however often the phone sends it again (StoreKit
-- hands an unfinished transaction back at every launch until the app finishes it).

create table public.credit_purchases (
  transaction_id text primary key,
  wallet_id uuid not null references public.credit_wallets (id) on delete cascade,
  product_id text not null,
  credits integer not null check (credits > 0),
  environment text not null,
  created_at timestamptz not null default now()
);
create index credit_purchases_wallet on public.credit_purchases (wallet_id, created_at);

alter table public.credit_purchases enable row level security;
revoke all on public.credit_purchases from anon, authenticated;

-- Credits a checked transaction, once. Returns the wallet's balance and whether this
-- call added the credits (false: already credited, to this wallet or another one).
create or replace function public.wallet_purchase(secret text, transaction_id text, product_id text, credits integer, environment text)
 returns table (balance integer, credited boolean)
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  w uuid := private.wallet_of(secret);
  added boolean := false;
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
    update public.credit_wallets set balance = public.credit_wallets.balance + wallet_purchase.credits where id = w;
    insert into public.credit_ledger (wallet_id, delta, reason) values (w, wallet_purchase.credits, 'purchase ' || wallet_purchase.product_id);
    added := true;
  end if;
  return query select cw.balance, added from public.credit_wallets cw where cw.id = w;
end;
$$;

revoke all on function public.wallet_purchase(text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.wallet_purchase(text, text, text, integer, text) to service_role;
