-- The evening margin alert counted the generations made for the owner (the daily lists'
-- images drawn on 2026-10-20, the editor's tries: done, 0 credit) as players' ones that
-- brought nothing in: "images 352 %" while the players' sheets cost 30 % of what they
-- paid. They are left out of the margin; the 24-hour spending alert still counts them.

/**
 * The margin of the generations over the last `days`, by kind: how many, how many
 * failed, what one costs on average, what it brings in at worst, and the share of that
 * the AI eats (cost_share: 1 means no margin left). Every credit counts at the worst paid
 * price: those of the welcome bonus bring nothing in, a cost of winning a player that this
 * doesn't measure. Generations made for the owner (the daily lists' images, the editor:
 * done, 0 credit) aren't the players': left out. A failure, also 0 credit, still counts.
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
    and not (c.ok and c.credits = 0)
  group by c.kind
  order by c.kind;
$$;
