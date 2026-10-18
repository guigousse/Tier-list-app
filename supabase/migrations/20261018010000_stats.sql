-- The statistics of the game, for the owner only: a `stats` schema the API never sees (no
-- grant to anon or authenticated), one view per indicator, and stats.dashboard() that
-- gathers them all in one JSON for the dashboard. Audience and retention proper (opens,
-- sessions) come from Firebase Analytics; here, what the database already knows: votes,
-- teams, lists, friends, credits, AI. Test: supabase/tests/stats.sql.
--
-- A player is a device_id: the app's install. Purchases made in TestFlight (environment
-- 'Sandbox') are counted apart and never as revenue.

create schema if not exists stats;
revoke all on schema stats from public, anon, authenticated;

-- Every trace a device leaves, with its time: the base of players and retention.
-- Re-voting moves list_votes.updated_at, so a vote counts at its latest date.
create or replace view stats.activity as
  select device_id, updated_at as at, 'vote' as kind from public.list_votes
  union all select device_id, created_at, 'daily' from public.daily_votes
  union all select device_id, created_at, 'view' from public.template_views
  union all select device_id, created_at, 'team' from public.badge_choices;

-- How many: players seen, profiles, wallets, and new players per week.
create or replace view stats.players as
  with first_seen as (select device_id, min(at) as at from stats.activity group by device_id)
  select
    (select count(*) from first_seen) as players,
    (select count(*) from first_seen where at > now() - interval '7 days') as new_7d,
    (select count(distinct device_id) from stats.activity where at > now() - interval '7 days') as active_7d,
    (select count(distinct device_id) from stats.activity where at > now() - interval '30 days') as active_30d,
    (select count(*) from public.profiles) as profiles,
    (select count(*) from public.profiles where push_token is not null) as push_enabled,
    (select count(*) from public.credit_wallets) as wallets;

create or replace view stats.new_players_weekly as
  with first_seen as (select device_id, min(at) as at from stats.activity group by device_id)
  select date_trunc('week', at)::date as week, count(*) as players from first_seen group by 1 order by 1;

-- Lists validated per player (public lists and daily lists), by bucket: a median says
-- more than a mean a few heavy players pull up.
create or replace view stats.lists_per_player as
  with n as (
    select device_id, count(*) as lists from (
      select device_id from public.list_votes where list_key like 'popular:%'
      union all select device_id from public.daily_votes
    ) v group by device_id
  )
  select
    count(*) as players,
    percentile_disc(0.5) within group (order by lists) as median,
    round(avg(lists), 1) as mean,
    max(lists) as max,
    count(*) filter (where lists = 1) as b1,
    count(*) filter (where lists between 2 and 5) as b2_5,
    count(*) filter (where lists between 6 and 24) as b6_24,
    count(*) filter (where lists >= 25) as b25_plus
  from n;

-- How far players go on the path: share reaching each step of validated lists.
create or replace view stats.path_funnel as
  with n as (
    select device_id, count(*) as lists from (
      select device_id from public.list_votes where list_key like 'popular:%'
      union all select device_id from public.daily_votes
    ) v group by device_id
  ), total as (select count(*) as all_players from n)
  select step, count(n.device_id) filter (where n.lists >= step) as players,
    round(100.0 * count(n.device_id) filter (where n.lists >= step) / nullif(max(total.all_players), 0), 1) as pct
  from unnest(array[1, 5, 12, 25, 35, 60, 90]) as step cross join n cross join total
  group by step order by step;

-- The daily list: votes per day.
create or replace view stats.daily_participation as
  select dl.day, dl.title, count(dv.device_id) as votes
  from public.daily_lists dl left join public.daily_votes dv on dv.day = dl.day
  where dl.day <= current_date
  group by dl.day, dl.title order by dl.day desc;

-- Retention of the players seen (not of every install: Firebase has those): of the players
-- first seen a week, how many came back the following weeks.
create or replace view stats.retention_weekly as
  with first_seen as (select device_id, date_trunc('week', min(at)) as cohort from stats.activity group by device_id),
  weeks as (select distinct a.device_id, date_trunc('week', a.at) as week from stats.activity a)
  select f.cohort::date as cohort, count(distinct f.device_id) as players,
    count(distinct w.device_id) filter (where w.week = f.cohort + interval '1 week') as week_1,
    count(distinct w.device_id) filter (where w.week = f.cohort + interval '2 weeks') as week_2,
    count(distinct w.device_id) filter (where w.week = f.cohort + interval '4 weeks') as week_4
  from first_seen f left join weeks w on w.device_id = f.device_id
  group by f.cohort order by f.cohort;

-- The teams of the VS steps: share of each side, and how teams go together.
create or replace view stats.teams as
  select fork, badge, count(*) as players,
    round(100.0 * count(*) / sum(count(*)) over (partition by fork), 1) as pct
  from public.badge_choices group by fork, badge order by fork, players desc;

create or replace view stats.team_pairs as
  select a.fork as fork_a, a.badge as badge_a, b.fork as fork_b, b.badge as badge_b, count(*) as players
  from public.badge_choices a join public.badge_choices b on b.device_id = a.device_id and b.fork > a.fork
  group by 1, 2, 3, 4 order by players desc;

-- The lists: played, opened, favourited.
create or replace view stats.lists as
  with votes as (select split_part(list_key, ':', 2) as k, count(*) as votes from public.list_votes where list_key like 'popular:%' group by 1),
  views as (select template_key as k, count(*) as views from public.template_views group by 1),
  favs as (select template_key as k, count(*) filter (where active) as favorites from public.template_favorites group by 1)
  select coalesce(v.k, w.k, f.k) as list_key,
    coalesce(t.title, bt.title, coalesce(v.k, w.k, f.k)) as title,
    coalesce(v.votes, 0) as votes, coalesce(w.views, 0) as views, coalesce(f.favorites, 0) as favorites,
    round(100.0 * coalesce(v.votes, 0) / nullif(w.views, 0), 1) as completion_pct
  from votes v full join views w on w.k = v.k full join favs f on f.k = coalesce(v.k, w.k)
  left join public.templates t on t.key = coalesce(v.k, w.k, f.k)
  left join private.builtin_titles bt on bt.key = coalesce(v.k, w.k, f.k)
  order by votes desc, views desc;

-- The cards players disagree on most (ranks far apart) and agree on most: matter for the
-- next daily lists. A rank is the tier's index (0 = S); at least 3 votes.
create or replace view stats.cards as
  with r as (
    select split_part(lv.list_key, ':', 2) as k, (u.i - 1)::int as idx, u.r::numeric as rank
    from public.list_votes lv, unnest(lv.ranks) with ordinality as u(r, i)
    where lv.list_key like 'popular:%' and u.r >= 0
    union all
    select 'daily-' || dv.day, (u.i - 1)::int, u.r::numeric
    from public.daily_votes dv, unnest(dv.ranks) with ordinality as u(r, i)
    where u.r >= 0
  )
  select r.k as list_key, r.idx,
    coalesce(t.items[r.idx + 1], dl.items[r.idx + 1], '#' || r.idx) as card,
    count(*) as votes, round(avg(rank), 2) as mean_rank, round(stddev_samp(rank), 2) as spread
  from r
  left join public.templates t on t.key = r.k
  left join public.daily_lists dl on 'daily-' || dl.day = r.k
  group by r.k, r.idx, t.items, dl.items
  having count(*) >= 3;

-- Friends: profiles, links, lists sent between friends and how alike the two rankings are.
create or replace view stats.social as
  select
    (select count(*) from public.profiles) as profiles,
    (select count(*) from public.friend_links where status = 'accepted') as friendships,
    (select round(2.0 * count(*) filter (where status = 'accepted') / nullif((select count(*) from public.profiles), 0), 2) from public.friend_links) as friends_per_profile,
    (select round(100.0 * count(*) filter (where status = 'accepted') / nullif(count(*) filter (where status in ('accepted', 'declined')), 0), 1) from public.friend_links) as accept_pct,
    (select count(*) from public.list_mail) as mail_sent,
    (select count(*) filter (where status = 'ranked') from public.list_mail) as mail_ranked,
    (select count(*) filter (where status = 'ignored') from public.list_mail) as mail_ignored,
    (select count(*) filter (where status = 'reported') from public.list_mail) as mail_reported,
    (select round(extract(epoch from avg(answered_at - created_at)) / 3600, 1) from public.list_mail where answered_at is not null) as answer_hours,
    -- Share of cards put in the same tier by both friends.
    (select round(100.0 * avg(same), 1) from (
      select (select avg((x.s = x.r)::int) from unnest(m.sender_ranks, m.recipient_ranks) as x(s, r)) as same
      from public.list_mail m where m.recipient_ranks is not null
    ) a) as agreement_pct,
    (select count(*) from public.shared_lists) as share_codes,
    (select count(*) from public.shared_lists where last_opened_at is not null) as share_codes_opened,
    (select count(*) from public.player_reports where created_at > now() - interval '7 days') as reports_7d,
    (select count(*) from public.player_blocks where created_at > now() - interval '7 days') as blocks_7d;

-- Credits: where they come from, where they go, what's left. Purchases: by product, real
-- (App Store) apart from TestFlight. Prices as in src/lib/shop.ts, taxes included.
create or replace view stats.credits as
  select
    case
      when reason = 'welcome' then 'bienvenue'
      when reason like 'milestone:%' then 'paliers'
      when reason like 'purchase %' then 'achats'
      when reason = 'refund' then 'remboursements IA'
      when reason in ('words', 'tiers', 'images') then 'dépense : ' || reason
      else 'autre (tests, service)'
    end as source,
    count(*) as entries, sum(delta) as credits
  from public.credit_ledger group by 1 order by credits desc;

create or replace view stats.wallets as
  with spent as (select wallet_id, -sum(delta) as spent from public.credit_ledger where reason in ('words', 'tiers', 'images') group by 1)
  select
    (select sum(balance) from public.credit_wallets) as balance_total,
    (select count(*) from spent where spent > 0) as spenders,
    (select percentile_disc(0.5) within group (order by spent) from spent where spent > 0) as spent_median,
    (select max(spent) from spent) as spent_max;

create or replace view stats.purchases as
  select p.product_id, p.environment, count(*) as purchases, count(*) filter (where p.refunded_at is not null) as refunded,
    count(distinct p.wallet_id) as buyers, sum(p.credits) as credits,
    sum(price.eur) filter (where p.refunded_at is null) as revenue_eur
  from public.credit_purchases p
  left join (values ('tiercraft.energy.60', 0.99), ('tiercraft.energy.200', 2.99), ('tiercraft.energy.360', 4.99),
    ('tiercraft.energy.800', 9.99), ('tiercraft.energy.1750', 19.99)) as price(product, eur) on price.product = p.product_id
  group by p.product_id, p.environment order by p.environment, revenue_eur desc nulls last;

-- The AI: what it costs in dollars against the credits it brings, and how often it fails.
create or replace view stats.ai as
  select kind, count(*) as runs, count(*) filter (where not ok) as failed,
    round(100.0 * count(*) filter (where not ok) / count(*), 1) as failed_pct,
    round(sum(cost_usd), 4) as cost_usd, round(avg(cost_usd), 5) as cost_per_run_usd,
    sum(credits) filter (where ok) as credits_billed
  from public.ai_costs group by kind order by cost_usd desc;

-- Everything in one JSON, for the dashboard.
create or replace function stats.dashboard()
 returns jsonb
 language sql
 stable
 set search_path to ''
as $$
  select jsonb_build_object(
    'generated_at', now(),
    'players', (select to_jsonb(p) from stats.players p),
    'new_players_weekly', (select coalesce(jsonb_agg(x), '[]') from stats.new_players_weekly x),
    'retention_weekly', (select coalesce(jsonb_agg(x), '[]') from stats.retention_weekly x),
    'lists_per_player', (select to_jsonb(x) from stats.lists_per_player x),
    'path_funnel', (select coalesce(jsonb_agg(x), '[]') from stats.path_funnel x),
    'daily_participation', (select coalesce(jsonb_agg(x), '[]') from (select * from stats.daily_participation limit 30) x),
    'teams', (select coalesce(jsonb_agg(x), '[]') from stats.teams x),
    'team_pairs', (select coalesce(jsonb_agg(x), '[]') from (select * from stats.team_pairs limit 20) x),
    'lists', (select coalesce(jsonb_agg(x), '[]') from (select * from stats.lists limit 40) x),
    'cards_divisive', (select coalesce(jsonb_agg(x), '[]') from (select * from stats.cards order by spread desc nulls last limit 15) x),
    'cards_consensual', (select coalesce(jsonb_agg(x), '[]') from (select * from stats.cards order by spread asc nulls last limit 15) x),
    'social', (select to_jsonb(x) from stats.social x),
    'credits', (select coalesce(jsonb_agg(x), '[]') from stats.credits x),
    'wallets', (select to_jsonb(x) from stats.wallets x),
    'purchases', (select coalesce(jsonb_agg(x), '[]') from stats.purchases x),
    'ai', (select coalesce(jsonb_agg(x), '[]') from stats.ai x)
  );
$$;

revoke all on all tables in schema stats from public, anon, authenticated;
revoke all on function stats.dashboard() from public, anon, authenticated;
