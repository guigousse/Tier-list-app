-- Challenge lists and referrals (20261020010000_challenges.sql, 20261020020000_referral_pending.sql). Run on the project: the
-- block always fails at the end, nothing kept. Expected error message: 'OK'.
do $$
declare
  ref_secret text := 'test-referrer-' || gen_random_uuid();
  new_secret text := 'test-new-' || gen_random_uuid();
  old_secret text := 'test-old-' || gen_random_uuid();
  unattested_secret text := 'test-unattested-' || gen_random_uuid();
  ref uuid;
  dev uuid := gen_random_uuid();
  share_code text;
  reinstall_secret text := 'test-reinstall-' || gen_random_uuid();
  eleventh_secret text := 'test-eleventh-' || gen_random_uuid();
  r jsonb;
  w uuid;
begin
  insert into public.credit_wallets (secret_hash, balance, attest_key_id, created_at)
  values (encode(sha256(convert_to(ref_secret, 'UTF8')), 'hex'), 0, 'test-key-' || gen_random_uuid(), now() - interval '30 days')
  returning id into ref;
  insert into public.credit_wallets (secret_hash, balance, attest_key_id, created_at) values
    (encode(sha256(convert_to(new_secret, 'UTF8')), 'hex'), 30, 'test-key-' || gen_random_uuid(), now()),
    (encode(sha256(convert_to(old_secret, 'UTF8')), 'hex'), 30, 'test-key-' || gen_random_uuid(), now() - interval '8 days'),
    (encode(sha256(convert_to(unattested_secret, 'UTF8')), 'hex'), 0, null, now());

  -- The share code remembers whose wallet shared it.
  share_code := public.share_challenge('{"v":1,"t":"Défi","r":[["S","#ff7f7f"],["A","#ffbf7f"]],"c":[["Pomme","#fff",0],["Kiwi","#fff",1]]}'::jsonb, ref_secret);
  if (select s.creator_wallet from public.shared_lists s where s.code = share_code) is distinct from ref then
    raise exception 'FAIL: the code does not know its sharer';
  end if;

  -- Only a new player counts: a recent wallet, verified by App Attest.
  r := public.claim_challenge(old_secret, gen_random_uuid(), share_code);
  if r->>'status' <> 'not_new' then raise exception 'FAIL: old wallet %', r; end if;
  r := public.claim_challenge(unattested_secret, gen_random_uuid(), share_code);
  if r->>'status' <> 'not_new' then raise exception 'FAIL: unattested wallet %', r; end if;
  r := public.claim_challenge(ref_secret, gen_random_uuid(), share_code);
  if r->>'status' <> 'own' then raise exception 'FAIL: own challenge %', r; end if;
  if private.referral_pending(ref) <> 0 then raise exception 'FAIL: paid for nothing'; end if;

  -- A new player ranks it: +5 for the sharer, once.
  r := public.claim_challenge(new_secret, dev, share_code);
  if r->>'status' <> 'credited' then raise exception 'FAIL: new player %', r; end if;
  if private.referral_pending(ref) <> 5 then raise exception 'FAIL: +5 not paid'; end if;
  r := public.claim_challenge(new_secret, dev, share_code);
  if r->>'status' <> 'already' then raise exception 'FAIL: second claim %', r; end if;
  -- The same device under another new wallet (a reinstall) does not pay again.
  insert into public.credit_wallets (secret_hash, balance, attest_key_id) values (encode(sha256(convert_to(reinstall_secret, 'UTF8')), 'hex'), 0, 'test-key-' || gen_random_uuid());
  r := public.claim_challenge(reinstall_secret, dev, share_code);
  if r->>'status' <> 'already' then raise exception 'FAIL: same device, new wallet %', r; end if;
  if private.referral_pending(ref) <> 5 then raise exception 'FAIL: paid twice'; end if;

  -- Three public lists validated by the newcomer: +30 for the sharer.
  insert into public.daily_votes (day, device_id, ranks)
  select d.day, dev, array_fill(0::smallint, array[cardinality(d.items)]) from public.daily_lists d
  where d.day <= (now() at time zone 'utc')::date order by d.day limit 2;
  if private.referral_pending(ref) <> 5 then raise exception 'FAIL: activated too early'; end if;
  insert into public.daily_votes (day, device_id, ranks)
  select d.day, dev, array_fill(0::smallint, array[cardinality(d.items)]) from public.daily_lists d
  where d.day <= (now() at time zone 'utc')::date order by d.day offset 2 limit 1;
  if private.referral_pending(ref) <> 35 then
    raise exception 'FAIL: activation not paid: %', private.referral_pending(ref);
  end if;
  insert into public.daily_votes (day, device_id, ranks)
  select d.day, dev, array_fill(0::smallint, array[cardinality(d.items)]) from public.daily_lists d
  where d.day <= (now() at time zone 'utc')::date order by d.day offset 3 limit 1;
  if private.referral_pending(ref) <> 35 then raise exception 'FAIL: activation paid twice'; end if;

  -- Ten referrals at most.
  for i in 1..9 loop
    insert into public.credit_wallets (secret_hash, balance, attest_key_id) values ('test-filler-' || gen_random_uuid(), 0, 'test-key-' || gen_random_uuid()) returning id into w;
    insert into public.referrals (referee_wallet, referrer_wallet, device_id, code) values (w, ref, gen_random_uuid(), share_code);
  end loop;
  insert into public.credit_wallets (secret_hash, balance, attest_key_id) values (encode(sha256(convert_to(eleventh_secret, 'UTF8')), 'hex'), 0, 'test-key-' || gen_random_uuid());
  r := public.claim_challenge(eleventh_secret, gen_random_uuid(), share_code);
  if r->>'status' <> 'cap' then raise exception 'FAIL: cap %', r; end if;

  -- The sponsor sees their referrals, then collects what they earned.
  r := public.referral_status(ref_secret);
  if (r->>'pending')::int <> 35 or (r->>'count')::int <> 10 or (r->>'cap')::int <> 10 then raise exception 'FAIL: status %', r; end if;
  if jsonb_array_length(r->'referrals') <> 10 then raise exception 'FAIL: referrals listed %', r->'referrals'; end if;
  if not exists (select 1 from jsonb_array_elements(r->'referrals') x where (x->>'lists')::int = 3 and (x->>'active')::boolean) then
    raise exception 'FAIL: active referral not shown %', r->'referrals';
  end if;
  if (select balance from public.credit_wallets where id = ref) <> 0 then raise exception 'FAIL: paid before being collected'; end if;
  if public.collect_referrals(ref_secret) <> 35 then raise exception 'FAIL: collect'; end if;
  if (select balance from public.credit_wallets where id = ref) <> 35 then raise exception 'FAIL: balance after collecting'; end if;
  if public.collect_referrals(ref_secret) <> 0 or private.referral_pending(ref) <> 0 then raise exception 'FAIL: collected twice'; end if;
  -- Nobody else's referrals: an unknown wallet sees nothing.
  r := public.referral_status('not-a-wallet');
  if (r->>'count')::int <> 0 then raise exception 'FAIL: unknown wallet %', r; end if;

  raise exception 'OK';
end $$;
