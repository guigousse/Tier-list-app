-- What each AI generation really costs, next to what the player paid for it
-- (supabase/functions/ai-generate/costs.ts writes one row per generation). The margin
-- of the generations is watched every evening: if a kind of generation starts eating
-- what it brings in (a longer prompt, a price rise, failures we pay for), the owner's
-- iPhone is told before it costs money.

create table public.ai_costs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('words', 'tiers', 'images')),
  -- AI calls made for this generation (a refused sheet drawn again counts twice).
  calls integer not null,
  input_tokens integer not null,
  output_tokens integer not null,
  cost_usd numeric(12, 6) not null,
  -- Credits charged to the player: 0 for a failure, which we still paid.
  credits integer not null,
  ok boolean not null
);
create index ai_costs_recent on public.ai_costs (created_at);
alter table public.ai_costs enable row level security;

-- Settings of the service: the owner's profile, to warn (key 'owner_profile').
create table if not exists private.config (key text primary key, value text not null);

-- Euros per dollar, and the least a credit brings in: 19.99 € for 1 750 credits, net of
-- 20 % VAT and Apple's 15 % (pricing in supabase/functions/ai-generate/purchase.ts).
create or replace function private.eur_per_usd() returns numeric language sql immutable as 'select 0.90';
create or replace function private.worst_eur_per_credit() returns numeric language sql immutable as 'select round(19.99 / 1.2 * 0.85 / 1750, 6)';

/**
 * The margin of the generations over the last `days`, by kind: how many, how many
 * failed, what one costs on average, what it brings in at worst, and the share of that
 * the AI eats (cost_share: 1 means no margin left). Every credit counts at the worst paid
 * price: those of the welcome bonus bring nothing in, a cost of winning a player that this
 * doesn't measure.
 */
create or replace function public.ai_margin(days integer default 7)
 returns table (kind text, generations bigint, failed bigint, avg_cost_eur numeric, avg_credits numeric, avg_revenue_eur numeric, cost_share numeric, total_cost_eur numeric)
 language sql
 stable
 security definer
 set search_path to ''
as $$
  select
    c.kind,
    count(*),
    count(*) filter (where not c.ok),
    round(avg(c.cost_usd) * private.eur_per_usd(), 4),
    round(avg(c.credits), 2),
    round(avg(c.credits) * private.worst_eur_per_credit(), 4),
    case when sum(c.credits) > 0 then round(sum(c.cost_usd) * private.eur_per_usd() / (sum(c.credits) * private.worst_eur_per_credit()), 3) end,
    round(sum(c.cost_usd) * private.eur_per_usd(), 2)
  from public.ai_costs c
  where c.created_at > now() - make_interval(days => days)
  group by c.kind
  order by c.kind;
$$;

/**
 * Every evening: warns the owner when a kind of generation, over the last 7 days and
 * at least 10 of them, costs more than 60 % of what it brings in at worst (or brings in
 * nothing), or when the AI cost more than 10 $ in the last 24 hours. Returns the alerts.
 */
create or replace function private.ai_cost_watch()
 returns text[]
 language plpgsql
 security definer
 set search_path to ''
as $$
declare
  owner uuid := (select value::uuid from private.config where key = 'owner_profile');
  alerts text[] := '{}';
  m record;
  day_usd numeric := (select coalesce(sum(cost_usd), 0) from public.ai_costs where created_at > now() - interval '1 day');
  names jsonb := '{"words": "Les cartes", "tiers": "Les noms de rangs", "images": "Les images"}';
begin
  for m in select * from public.ai_margin(7) where generations >= 10 loop
    if m.cost_share is null or m.cost_share > 0.6 then
      alerts := alerts || format('%s : l''IA coûte %s %% de ce que ça rapporte (%s générations sur 7 jours, %s € l''une en moyenne).',
        names ->> m.kind, coalesce(round(m.cost_share * 100)::text, '∞'), m.generations, round(m.avg_cost_eur, 3));
    end if;
  end loop;
  if day_usd > 10 then
    alerts := alerts || format('L''IA a coûté %s $ ces dernières 24 heures.', round(day_usd, 2));
  end if;
  if owner is not null and array_length(alerts, 1) > 0 then
    perform private.push(owner, 'Tiercraft : coût de l''IA', array_to_string(alerts, ' '), '{"type": "ai_costs"}'::jsonb);
  end if;
  return alerts;
end;
$$;

revoke all on function public.ai_margin(integer) from public, anon, authenticated;
grant execute on function public.ai_margin(integer) to service_role;
revoke all on function private.ai_cost_watch() from public, anon, authenticated;

-- 21:07 in Paris (19:07 UTC in summer), after the evening's games.
select cron.schedule('tiercraft-ai-cost-watch', '7 19 * * *', 'select private.ai_cost_watch()');
