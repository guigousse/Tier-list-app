-- Credits: each install has a wallet, kept on the server only. The app shows the
-- balance; it can neither write it nor name a price. Every function below is callable by
-- the service role alone (the ai-generate edge function), never by the app's key.
--
-- A wallet is reached with a random secret only the install knows (the database keeps
-- its SHA-256), saved in the iOS Keychain like the profile's. A generation first holds
-- what it may cost, then settles on what was delivered: the rest goes back. A hold left
-- open by a request that died (the edge function's CPU limit, a crash) is given back
-- after 10 minutes, so a failure never costs the player.

create table public.credit_wallets (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null unique,
  balance integer not null default 0 check (balance >= 0),
  -- App Attest key that earned the welcome bonus: one bonus per key, one per wallet.
  attest_key_id text unique,
  created_at timestamptz not null default now()
);

create table public.credit_holds (
  id bigserial primary key,
  wallet_id uuid not null references public.credit_wallets (id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null,
  used integer,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index credit_holds_open on public.credit_holds (wallet_id) where settled_at is null;

-- Every movement, for support and for the reuse/margin figures.
create table public.credit_ledger (
  id bigserial primary key,
  wallet_id uuid not null references public.credit_wallets (id) on delete cascade,
  delta integer not null,
  reason text not null,
  hold_id bigint references public.credit_holds (id),
  created_at timestamptz not null default now()
);
create index credit_ledger_wallet on public.credit_ledger (wallet_id, created_at);

-- One-use App Attest challenges: an attestation can't be replayed.
create table public.attest_challenges (
  challenge text primary key,
  created_at timestamptz not null default now()
);

alter table public.credit_wallets enable row level security;
alter table public.credit_holds enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.attest_challenges enable row level security;

create or replace function private.wallet_of(secret text)
 returns uuid
 language sql
 stable
 security definer
 set search_path to ''
as $$
  select w.id from public.credit_wallets w where w.secret_hash = encode(sha256(convert_to(wallet_of.secret, 'UTF8')), 'hex');
$$;

-- Gives back the holds a dead request left open.
create or replace function private.release_stale(wallet uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  back integer;
begin
  with stale as (
    update public.credit_holds h set settled_at = now(), used = 0
    where h.wallet_id = release_stale.wallet and h.settled_at is null and h.created_at < now() - interval '10 minutes'
    returning h.id, h.amount
  ), logged as (
    insert into public.credit_ledger (wallet_id, delta, reason, hold_id)
    select release_stale.wallet, s.amount, 'refund', s.id from stale s
    returning delta
  )
  select coalesce(sum(delta), 0) into back from logged;
  if back > 0 then
    update public.credit_wallets set balance = balance + back where id = release_stale.wallet;
  end if;
end;
$$;

-- Opens the wallet of this secret if it doesn't exist yet (empty), and returns its balance.
create or replace function public.wallet_open(secret text)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  w uuid;
  b integer;
begin
  if char_length(coalesce(secret, '')) < 32 then
    raise exception 'invalid secret';
  end if;
  insert into public.credit_wallets (secret_hash)
  values (encode(sha256(convert_to(secret, 'UTF8')), 'hex'))
  on conflict (secret_hash) do nothing;
  w := private.wallet_of(secret);
  perform private.release_stale(w);
  select balance into b from public.credit_wallets where id = w;
  return b;
end;
$$;

-- Takes `amount` from the wallet for a generation about to run, or raises 'credits'.
-- Atomic: two generations at once can't spend the same credits.
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

-- Ends a hold: `used` credits are kept, the rest goes back. Settling twice does nothing.
-- Returns the wallet's balance.
create or replace function public.wallet_settle(hold bigint, used integer)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  w uuid;
  back integer;
  b integer;
begin
  update public.credit_holds h
  set settled_at = now(), used = least(greatest(coalesce(wallet_settle.used, 0), 0), h.amount)
  where h.id = wallet_settle.hold and h.settled_at is null
  returning h.wallet_id, h.amount - h.used into w, back;
  if w is null then
    select h.wallet_id into w from public.credit_holds h where h.id = wallet_settle.hold;
  elsif back > 0 then
    update public.credit_wallets set balance = balance + back where id = w;
    insert into public.credit_ledger (wallet_id, delta, reason, hold_id) values (w, back, 'refund', wallet_settle.hold);
  end if;
  select balance into b from public.credit_wallets where id = w;
  return b;
end;
$$;

-- The welcome bonus, once per wallet and once per App Attest key (checked by the edge
-- function before calling). Returns the balance.
create or replace function public.wallet_welcome(secret text, key_id text, amount integer)
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
  if not exists (select 1 from public.credit_wallets where attest_key_id = key_id) then
    update public.credit_wallets set attest_key_id = key_id, balance = balance + amount
    where id = w and attest_key_id is null;
    if found then
      insert into public.credit_ledger (wallet_id, delta, reason) values (w, amount, 'welcome');
    end if;
  end if;
  select balance into b from public.credit_wallets where id = w;
  return b;
end;
$$;

-- Credits added by hand (tests, support, later the in-app purchases' server).
create or replace function public.wallet_grant(wallet uuid, amount integer, reason text)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  b integer;
begin
  update public.credit_wallets set balance = balance + amount where id = wallet returning balance into b;
  if not found then
    raise exception 'unknown wallet';
  end if;
  insert into public.credit_ledger (wallet_id, delta, reason) values (wallet, amount, reason);
  return b;
end;
$$;

create or replace function public.attest_challenge()
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  c text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  delete from public.attest_challenges where created_at < now() - interval '10 minutes';
  insert into public.attest_challenges (challenge) values (c);
  return c;
end;
$$;

-- Uses up a challenge: true once, if it was issued less than 5 minutes ago.
create or replace function public.attest_take(challenge text)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  delete from public.attest_challenges a where a.challenge = attest_take.challenge and a.created_at > now() - interval '5 minutes';
  return found;
end;
$$;

revoke all on function public.wallet_open(text) from public, anon, authenticated;
revoke all on function public.wallet_hold(text, integer, text) from public, anon, authenticated;
revoke all on function public.wallet_settle(bigint, integer) from public, anon, authenticated;
revoke all on function public.wallet_welcome(text, text, integer) from public, anon, authenticated;
revoke all on function public.wallet_grant(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.attest_challenge() from public, anon, authenticated;
revoke all on function public.attest_take(text) from public, anon, authenticated;
revoke all on function private.wallet_of(text) from public, anon, authenticated;
revoke all on function private.release_stale(uuid) from public, anon, authenticated;
grant execute on function public.wallet_open(text) to service_role;
grant execute on function public.wallet_hold(text, integer, text) to service_role;
grant execute on function public.wallet_settle(bigint, integer) to service_role;
grant execute on function public.wallet_welcome(text, text, integer) to service_role;
grant execute on function public.wallet_grant(uuid, integer, text) to service_role;
grant execute on function public.attest_challenge() to service_role;
grant execute on function public.attest_take(text) to service_role;

-- Row security already hides every row from the app's key; no table rights either.
revoke all on public.credit_wallets, public.credit_holds, public.credit_ledger, public.attest_challenges from anon, authenticated;
