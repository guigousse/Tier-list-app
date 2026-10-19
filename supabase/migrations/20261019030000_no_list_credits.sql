-- The lists path gives avatar items only: no more credits every 25 lists. Versions of
-- the app from before still call claim_list_credits after opening their wallet, and
-- still celebrate "+5" at 25, 50…: the function stays, so they don't fail, but only
-- answers the balance. Steps already paid stay paid (credit_milestones, credit_ledger).

create or replace function public.wallet_milestones(secret text, device_id uuid)
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
  select balance into b from public.credit_wallets where id = w;
  return b;
end;
$$;

revoke all on function public.wallet_milestones(text, uuid) from public, anon, authenticated;
grant execute on function public.wallet_milestones(text, uuid) to service_role;
