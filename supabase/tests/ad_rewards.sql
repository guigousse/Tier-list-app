-- The rewarded ad (20261020030000_ad_rewards.sql). Run on the project: the block always
-- fails at the end, nothing kept. Expected error message: 'OK'.
do $$
declare
  secret text := 'test-ad-' || gen_random_uuid();
  other_secret text := 'test-ad-other-' || gen_random_uuid();
  w uuid;
  other uuid;
  unverified_secret text := 'test-ad-unverified-' || gen_random_uuid();
  r jsonb;
  ticket text;
  tx text := 'test-tx-' || gen_random_uuid();
begin
  insert into public.credit_wallets (secret_hash, balance, attest_key_id) values (encode(sha256(convert_to(secret, 'UTF8')), 'hex'), 10, 'test-key-' || gen_random_uuid()) returning id into w;
  insert into public.credit_wallets (secret_hash, balance, attest_key_id) values (encode(sha256(convert_to(other_secret, 'UTF8')), 'hex'), 0, 'test-key-' || gen_random_uuid()) returning id into other;
  insert into public.credit_wallets (secret_hash, balance) values (encode(sha256(convert_to(unverified_secret, 'UTF8')), 'hex'), 0);

  -- A wallet App Attest never vouched for gets no ticket: scripted wallets can't farm ads.
  begin
    perform public.ad_ticket(unverified_secret);
    raise exception 'FAIL: ticket for an unverified wallet';
  exception when others then
    if sqlerrm <> 'unverified' then raise; end if;
  end;

  -- No ad watched yet: available, and a ticket.
  r := public.ad_status(secret);
  if (r->>'available')::boolean is not true or r->>'next_at' is not null then raise exception 'FAIL: status before %', r; end if;
  r := public.ad_ticket(secret);
  ticket := r->>'ticket';
  if (r->>'available')::boolean is not true or length(ticket) <> 64 then raise exception 'FAIL: ticket %', r; end if;
  -- Asked again before the ad played: the same ticket, not a new one each tap.
  if public.ad_ticket(secret)->>'ticket' is distinct from ticket then raise exception 'FAIL: ticket not reused'; end if;

  -- Unknown or expired tickets pay nothing.
  if private.ad_credit('nope', 'test-tx-nope') <> 'unknown' then raise exception 'FAIL: unknown ticket'; end if;
  insert into public.ad_tickets (ticket, wallet_id, expires_at) values ('test-expired-' || w, w, now() - interval '1 minute');
  if private.ad_credit('test-expired-' || w, 'test-tx-expired') <> 'expired' then raise exception 'FAIL: expired ticket'; end if;
  if (select balance from public.credit_wallets where id = w) <> 10 then raise exception 'FAIL: paid for a bad ticket'; end if;

  -- The ad AdMob vouched for: +5, logged with its transaction.
  if public.ad_reward(ticket, tx) <> 'credited' then raise exception 'FAIL: not credited'; end if;
  if (select balance from public.credit_wallets where id = w) <> 15 then raise exception 'FAIL: +5 not paid'; end if;
  if not exists (select 1 from public.credit_ledger l where l.wallet_id = w and l.delta = 5 and l.reason = 'ad:' || tx) then
    raise exception 'FAIL: no ledger line';
  end if;

  -- The callback replayed: nothing more.
  if private.ad_credit(ticket, tx) <> 'already' then raise exception 'FAIL: replay'; end if;
  if (select balance from public.credit_wallets where id = w) <> 15 then raise exception 'FAIL: paid twice'; end if;
  -- The same ticket under another transaction: used.
  if private.ad_credit(ticket, tx || '-2') <> 'used' then raise exception 'FAIL: ticket reused'; end if;

  -- A second ad within the week: no ticket, and the date of the next one.
  r := public.ad_ticket(secret);
  if (r->>'available')::boolean is not false or r ? 'ticket' or (r->>'next_at')::timestamptz < now() + interval '6 days 23 hours' then
    raise exception 'FAIL: second ticket %', r;
  end if;
  r := public.ad_status(secret);
  if (r->>'available')::boolean is not false or r->>'next_at' is null then raise exception 'FAIL: status after %', r; end if;
  -- Even with a ticket taken before the first ad was paid.
  insert into public.ad_tickets (ticket, wallet_id) values ('test-early-' || w, w);
  if private.ad_credit('test-early-' || w, tx || '-3') <> 'week' then raise exception 'FAIL: second ad paid'; end if;
  if (select balance from public.credit_wallets where id = w) <> 15 then raise exception 'FAIL: second ad credited'; end if;

  -- Another wallet is not held back by this one's ad.
  r := public.ad_ticket(other_secret);
  if (r->>'available')::boolean is not true then raise exception 'FAIL: other wallet %', r; end if;

  -- A week later, the next ad pays.
  update public.ad_rewards set created_at = now() - interval '7 days 1 minute' where wallet_id = w;
  r := public.ad_ticket(secret);
  if (r->>'available')::boolean is not true then raise exception 'FAIL: a week later %', r; end if;
  if private.ad_credit(r->>'ticket', tx || '-4') <> 'credited' then raise exception 'FAIL: next week not paid'; end if;
  if (select balance from public.credit_wallets where id = w) <> 20 then raise exception 'FAIL: next week balance'; end if;

  -- Unknown wallet: refused.
  begin
    perform public.ad_ticket('test-nobody-' || gen_random_uuid());
    raise exception 'FAIL: unknown wallet given a ticket';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;

  -- The app's key can ask for tickets, never pay itself.
  if not has_function_privilege('anon', 'public.ad_ticket(text)', 'execute') then raise exception 'FAIL: anon cannot take a ticket'; end if;
  if has_function_privilege('anon', 'public.ad_reward(text, text)', 'execute') then raise exception 'FAIL: anon can pay itself'; end if;
  if has_function_privilege('anon', 'private.ad_credit(text, text)', 'execute') then raise exception 'FAIL: anon can credit'; end if;

  raise exception 'OK';
end;
$$;
