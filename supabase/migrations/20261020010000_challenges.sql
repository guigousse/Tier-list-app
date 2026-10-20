-- Challenge lists: a ranking shared for friends to rank in turn and compare. When it brings
-- in a new player, its sharer earns credits: +5 once the newcomer ranks it, +30 once they
-- have ranked 3 public lists. A player already in the game earns their friend nothing, or
-- two friends could farm credits by ranking each other's lists.

-- Whose wallet shared the code (null for the codes made before, or without a wallet).
alter table public.shared_lists add column creator_wallet uuid references public.credit_wallets (id) on delete set null;

-- One sponsor per player, for life. device_id is the app's own id: not a proof, but a
-- second wallet on the same install (a reinstall) can't be referred again with it.
create table public.referrals (
  referee_wallet uuid primary key references public.credit_wallets (id) on delete cascade,
  referrer_wallet uuid not null references public.credit_wallets (id) on delete cascade,
  device_id uuid not null unique,
  code text not null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  check (referee_wallet <> referrer_wallet)
);
create index referrals_referrer on public.referrals (referrer_wallet);
alter table public.referrals enable row level security;

-- share_list, the code tied to the sharer's wallet. Its wallet stays unknown to the players
-- who open the code: they only ever see the list.
create or replace function public.share_challenge(payload jsonb, wallet text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code text := public.share_list(payload);
begin
  update public.shared_lists s set creator_wallet = private.wallet_of(share_challenge.wallet) where s.code = new_code;
  return new_code;
end;
$$;

-- The referrer's +30, once the newcomer has ranked 3 public lists.
create or replace function private.activate_referral(device uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  referrer uuid;
  referee uuid;
begin
  if private.public_lists_done(device) < 3 then
    return;
  end if;
  update public.referrals r set activated_at = now()
  where r.device_id = device and r.activated_at is null
  returning r.referrer_wallet, r.referee_wallet into referrer, referee;
  if referrer is not null then
    perform public.wallet_grant(referrer, 30, 'referral-active:' || referee);
  end if;
end;
$$;

-- Called when the player ranks a challenge list opened from a code. Pays its sharer +5 if
-- the player is new: a wallet verified by App Attest, made less than 7 days ago, never
-- referred, on a device never referred; 10 referrals at most per sponsor.
create or replace function public.claim_challenge(wallet text, device_id uuid, code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
    insert into public.referrals (referee_wallet, referrer_wallet, device_id, code)
    values (me.id, sharer, claim_challenge.device_id, upper(claim_challenge.code));
  exception when unique_violation then
    return jsonb_build_object('status', 'already');
  end;
  perform public.wallet_grant(sharer, 5, 'referral:' || me.id);
  -- Lists ranked before this one count too.
  perform private.activate_referral(claim_challenge.device_id);
  return jsonb_build_object('status', 'credited');
end;
$$;

create or replace function private.on_vote_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.referrals r where r.device_id = new.device_id and r.activated_at is null) then
    perform private.activate_referral(new.device_id);
  end if;
  return null;
exception when others then
  -- A vote is never lost to the referral's bookkeeping.
  return null;
end;
$$;
create trigger daily_votes_referral after insert on public.daily_votes for each row execute function private.on_vote_referral();
create trigger list_votes_referral after insert or update on public.list_votes for each row execute function private.on_vote_referral();

revoke all on function public.share_challenge(jsonb, text) from public;
revoke all on function public.claim_challenge(text, uuid, text) from public;
grant execute on function public.share_challenge(jsonb, text) to anon, authenticated;
grant execute on function public.claim_challenge(text, uuid, text) to anon, authenticated;
