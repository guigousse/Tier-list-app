-- Credits on the lists path: 5 every 25 public tier lists validated (src/lib/rewards.ts,
-- CREDIT_EVERY and CREDIT_AMOUNT). The app only draws them: the server counts the lists
-- itself, from the votes of the device (popular lists and daily tier lists, as on
-- profiles), and pays each step once.
--
-- Once per wallet and once per device: a new wallet on the same phone, or a reinstall,
-- can't be paid again for the same steps. Only wallets Apple vouched for (App Attest,
-- as for the welcome bonus) are paid, so that a script can't farm credits from votes.

create table public.credit_milestones (
  wallet_id uuid not null references public.credit_wallets (id) on delete cascade,
  device_id uuid not null,
  at integer not null check (at > 0),
  created_at timestamptz not null default now(),
  primary key (wallet_id, at),
  unique (device_id, at)
);
alter table public.credit_milestones enable row level security;
revoke all on public.credit_milestones from anon, authenticated;

-- Pays the steps reached and not paid yet; returns the wallet's balance.
create or replace function public.wallet_milestones(secret text, device_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  every constant integer := 25;
  amount constant integer := 5;
  w uuid := private.wallet_of(secret);
  completed integer;
  paid integer;
  b integer;
begin
  if w is null then
    raise exception 'unknown wallet';
  end if;
  if exists (select 1 from public.credit_wallets cw where cw.id = w and cw.attest_key_id is not null) then
    completed :=
      (select count(*) from public.list_votes lv where lv.device_id = wallet_milestones.device_id and lv.list_key like 'popular:%')
      + (select count(*) from public.daily_votes dv where dv.device_id = wallet_milestones.device_id);
    with steps as (
      insert into public.credit_milestones (wallet_id, device_id, at)
      select w, wallet_milestones.device_id, s.at
      from generate_series(every, (completed / every) * every, every) as s(at)
      on conflict do nothing
      returning at
    ), logged as (
      insert into public.credit_ledger (wallet_id, delta, reason)
      select w, amount, 'milestone:' || steps.at from steps
      returning delta
    )
    select coalesce(sum(delta), 0) into paid from logged;
    if paid > 0 then
      update public.credit_wallets set balance = balance + paid where id = w;
    end if;
  end if;
  select balance into b from public.credit_wallets where id = w;
  return b;
end;
$$;

revoke all on function public.wallet_milestones(text, uuid) from public, anon, authenticated;
grant execute on function public.wallet_milestones(text, uuid) to service_role;
