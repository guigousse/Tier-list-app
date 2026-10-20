-- Referrals go through the Edge Function referral-claim, which first asks Apple's DeviceCheck
-- whether this iPhone was already sponsored (a bit Apple keeps across reinstalls, when the
-- wallet and the device id are new). Calling claim_challenge directly would skip that check.

revoke execute on function public.claim_challenge(text, uuid, text) from anon, authenticated;

-- Called by the function, every claim would come from its address and share one rate limit
-- (claim_challenge: 30 an hour) between all players. The service role passes on the
-- player's address in x-client-ip; from anyone else that header is ignored, it could be forged.
create or replace function private.client_ip()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    case when current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
      then nullif(current_setting('request.headers', true)::json->>'x-client-ip', '') end,
    nullif(current_setting('request.headers', true)::json->>'cf-connecting-ip', ''),
    nullif(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), ''),
    'unknown'
  );
$$;
