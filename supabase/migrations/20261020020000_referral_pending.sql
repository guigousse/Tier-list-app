-- A sponsor's earnings wait in a pot until they collect them from the "Free energy"
-- section: the tap that collects them is the moment the player sees the referral worked.

alter table public.referrals add column pending integer not null default 0 check (pending >= 0);

-- What a sponsor has earned and not collected yet.
create or replace function private.referral_pending(wallet uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(r.pending), 0)::integer from public.referrals r where r.referrer_wallet = referral_pending.wallet;
$$;

create or replace function private.activate_referral(device uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.public_lists_done(device) < 3 then
    return;
  end if;
  update public.referrals r set activated_at = now(), pending = r.pending + 30
  where r.device_id = device and r.activated_at is null;
end;
$$;

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
    insert into public.referrals (referee_wallet, referrer_wallet, device_id, code, pending)
    values (me.id, sharer, claim_challenge.device_id, upper(claim_challenge.code), 5);
  exception when unique_violation then
    return jsonb_build_object('status', 'already');
  end;
  -- Lists ranked before this one count too.
  perform private.activate_referral(claim_challenge.device_id);
  return jsonb_build_object('status', 'credited');
end;
$$;

-- The sponsor's referrals, newest first: the newcomer's pseudo if they made a profile,
-- their public lists ranked (up to the 3 that pay), and what waits to be collected.
create or replace function public.referral_status(wallet text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.wallet_of(referral_status.wallet);
begin
  perform private.hit('referral_status', 120);
  return jsonb_build_object(
    'pending', private.referral_pending(me),
    'count', (select count(*) from public.referrals r where r.referrer_wallet = me),
    'cap', 10,
    'referrals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'pseudo', p.pseudo,
        'lists', least(3, private.public_lists_done(r.device_id)),
        'active', r.activated_at is not null,
        'since', r.created_at
      ) order by r.created_at desc)
      from public.referrals r
      left join public.profiles p on p.device_id = r.device_id and not p.hidden
      where r.referrer_wallet = me
    ), '[]'::jsonb)
  );
end;
$$;

-- Moves the pot onto the wallet; returns what was collected.
create or replace function public.collect_referrals(wallet text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.wallet_of(collect_referrals.wallet);
  total integer;
begin
  perform private.hit('collect_referrals', 60);
  if me is null then
    return 0;
  end if;
  -- The rows locked and read before zeroing: an update's returning gives the new values.
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
$$;

revoke all on function public.referral_status(text) from public;
revoke all on function public.collect_referrals(text) from public;
grant execute on function public.referral_status(text) to anon, authenticated;
grant execute on function public.collect_referrals(text) to anon, authenticated;
