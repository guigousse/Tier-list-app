-- The app claims the credits of the lists path itself, right after opening its wallet
-- (src/lib/credits.ts). Like every function the app calls, it is rate-limited by IP; it
-- needs the wallet's secret, and only pays what wallet_milestones allows: steps counted
-- by the server from the device's votes, once per wallet and per device, wallets
-- attested by Apple only. wallet_milestones itself stays for the service role alone.

create or replace function public.claim_list_credits(wallet text, device_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  perform private.hit('claim_list_credits', 60);
  return public.wallet_milestones(claim_list_credits.wallet, claim_list_credits.device_id);
end;
$$;

revoke all on function public.claim_list_credits(text, uuid) from public;
grant execute on function public.claim_list_credits(text, uuid) to anon, authenticated;
