-- The rewarded ad of the "Free energy" page: one ad watched pays 5 credits, once a week
-- (a sliding 7 days since the last ad paid). The app never says an ad was watched:
-- AdMob's server-side verification calls the ad-reward Edge function, which checks
-- Google's signature, then credits through private.ad_credit. The app only asks for a
-- ticket first, passed to the ad as its custom data, so the callback knows the wallet
-- without the wallet's secret ever reaching Google.

create table public.ad_rewards (
  id bigint generated always as identity primary key,
  wallet_id uuid not null references public.credit_wallets (id) on delete cascade,
  -- AdMob's id for the reward: its callback may come twice, it pays once.
  transaction_id text not null unique,
  created_at timestamptz not null default now()
);
create index ad_rewards_wallet on public.ad_rewards (wallet_id, created_at desc);

create table public.ad_tickets (
  ticket text primary key,
  wallet_id uuid not null references public.credit_wallets (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',
  used_at timestamptz
);
create index ad_tickets_wallet on public.ad_tickets (wallet_id);

alter table public.ad_rewards enable row level security;
alter table public.ad_tickets enable row level security;
revoke all on public.ad_rewards, public.ad_tickets from anon, authenticated;

-- When the wallet can watch its next paid ad: null if it can now.
create or replace function private.ad_next_at(wallet uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(a.created_at) + interval '7 days' from public.ad_rewards a
  where a.wallet_id = ad_next_at.wallet and a.created_at > now() - interval '7 days';
$$;

create or replace function public.ad_status(wallet text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.wallet_of(ad_status.wallet);
  next_at timestamptz;
begin
  perform private.hit('ad_status', 120);
  if me is null then
    raise exception 'unknown wallet';
  end if;
  -- Only a wallet App Attest vouched for: wallets made by a script would each farm a paid ad.
  if (select w.attest_key_id from public.credit_wallets w where w.id = me) is null then
    raise exception 'unverified';
  end if;
  next_at := private.ad_next_at(me);
  return jsonb_build_object('available', next_at is null, 'next_at', next_at);
end;
$$;

-- A single-use ticket for the ad about to be shown, or when the next one will pay.
create or replace function public.ad_ticket(wallet text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.wallet_of(ad_ticket.wallet);
  next_at timestamptz;
  t text;
begin
  perform private.hit('ad_ticket', 30);
  if me is null then
    raise exception 'unknown wallet';
  end if;
  -- Only a wallet App Attest vouched for: wallets made by a script would each farm a paid ad.
  if (select w.attest_key_id from public.credit_wallets w where w.id = me) is null then
    raise exception 'unverified';
  end if;
  next_at := private.ad_next_at(me);
  if next_at is not null then
    return jsonb_build_object('available', false, 'next_at', next_at);
  end if;
  -- An ad closed before its end, then tried again: the open ticket serves again, so a
  -- wallet holds about one ticket an hour however often the player taps.
  select k.ticket into t from public.ad_tickets k
  where k.wallet_id = me and k.used_at is null and k.expires_at > now() + interval '10 minutes'
  order by k.expires_at desc limit 1;
  if t is null then
    -- 64 hex characters from two random uuids, as attest_challenge: not guessable.
    t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    insert into public.ad_tickets (ticket, wallet_id) values (t, me);
  end if;
  return jsonb_build_object('available', true, 'ticket', t);
end;
$$;

-- Pays the ad AdMob vouched for. Returns 'credited', or why not: 'already' (this
-- transaction was paid), 'unknown', 'used', 'expired' (the ticket), 'week' (an ad
-- was paid less than 7 days ago).
create or replace function private.ad_credit(ticket text, transaction_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
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
  -- The wallet locked: two tickets redeemed at once can't both pass the weekly limit.
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
$$;

-- The Edge function's door to private.ad_credit (the private schema isn't served by
-- the API): the service key only.
create or replace function public.ad_reward(ticket text, transaction_id text)
returns text
language sql
security definer
set search_path = ''
as $$
  select private.ad_credit(ad_reward.ticket, ad_reward.transaction_id);
$$;

revoke all on function private.ad_next_at(uuid) from public, anon, authenticated;
revoke all on function private.ad_credit(text, text) from public, anon, authenticated;
revoke all on function public.ad_reward(text, text) from public, anon, authenticated;
grant execute on function public.ad_reward(text, text) to service_role;
revoke all on function public.ad_status(text) from public;
revoke all on function public.ad_ticket(text) from public;
grant execute on function public.ad_status(text) to anon, authenticated;
grant execute on function public.ad_ticket(text) to anon, authenticated;
