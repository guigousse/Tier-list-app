-- The lists path counts public tier lists only: templates published, tier lists built
-- into the app (private.builtin_titles) and daily tier lists (on their day, or played
-- later from the archive as `daily-YYYY-MM-DD`). Until now any `popular:` key was taken,
-- so made-up keys could be voted by the hundred to farm the path's credits.
--
-- Each public list counts once: a template whose cards changed gives a new vote key
-- (`popular:<key>:<hash>`) but is the same list, and a past daily played later is the
-- same list as its day's vote. The count is bounded by the catalogue.
-- Test: supabase/tests/public_lists_only.sql.

-- Whether `key` (a template key, as in `popular:<key>:<hash>`) is a public tier list.
create or replace function private.is_public_list(key text)
 returns boolean
 language sql
 stable
 set search_path to ''
as $$
  select exists (select 1 from public.templates t where t.key = is_public_list.key and t.published)
    or exists (select 1 from private.builtin_titles b where b.key = is_public_list.key)
    or (is_public_list.key ~ '^daily-\d{4}-\d{2}-\d{2}$'
        and exists (select 1 from public.daily_lists dl
                    where dl.day::text = substr(is_public_list.key, 7)
                      and dl.day <= (now() at time zone 'utc')::date + 1));
$$;

-- Public tier lists a device completed: its daily votes and its votes on public lists,
-- each list once.
create or replace function private.public_lists_done(device_id uuid)
 returns integer
 language sql
 stable
 set search_path to ''
as $$
  select count(*)::integer from (
    select 'daily-' || dv.day::text as list from public.daily_votes dv where dv.device_id = public_lists_done.device_id
    union
    select split_part(lv.list_key, ':', 2) from public.list_votes lv
    where lv.device_id = public_lists_done.device_id and lv.list_key like 'popular:%'
      and private.is_public_list(split_part(lv.list_key, ':', 2))
  ) lists;
$$;

-- Votes on lists that don't exist are refused: they fed neither the path nor the stats.
create or replace function public.submit_list_vote(list_key text, device_id uuid, ranks smallint[])
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  perform private.hit('list_vote', 300);
  if submit_list_vote.list_key not like 'popular:%' or not private.is_public_list(split_part(submit_list_vote.list_key, ':', 2)) then
    raise exception 'unknown list';
  end if;
  if cardinality(ranks) not between 1 and 300
     or exists (select 1 from unnest(ranks) r where r is null or r < 0 or r > 4) then
    raise exception 'invalid ranking';
  end if;
  insert into public.list_votes (list_key, device_id, ranks)
  values (submit_list_vote.list_key, submit_list_vote.device_id, ranks)
  on conflict on constraint list_votes_pkey
  do update set ranks = excluded.ranks, updated_at = now();
end;
$$;

-- Credits of the path: same as before, counted on public lists.
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
    completed := private.public_lists_done(wallet_milestones.device_id);
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

-- Progress kept after a reinstall: the same count.
create or replace function public.restore_progress(device_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  perform private.hit('restore_progress', 30);
  return jsonb_build_object(
    'completed', private.public_lists_done(restore_progress.device_id),
    'days',
      coalesce((select jsonb_agg(dv.day order by dv.day) from public.daily_votes dv where dv.device_id = restore_progress.device_id), '[]'::jsonb),
    'choices',
      coalesce((select jsonb_object_agg(bc.fork, bc.badge) from public.badge_choices bc where bc.device_id = restore_progress.device_id), '{}'::jsonb)
  );
end;
$$;

-- Profiles: public lists the same way, plus tier lists ranked with friends (unchanged).
create or replace function private.card(profile_id uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'pseudo', case when p.hidden then 'Joueur signalé' else p.pseudo end,
    'tag', p.tag,
    'avatar', case when p.hidden then '🚫' else p.avatar end,
    'hidden', p.hidden,
    'badges', case when p.hidden then '{}'::text[] else p.badges end,
    'completed',
      private.public_lists_done(p.device_id)
      + (select count(distinct m.content_hash) from public.list_mail m
         where (m.recipient = p.id and m.status = 'ranked')
            or (m.sender = p.id and not (-1::smallint = any (m.sender_ranks))))
  )
  from public.profiles p where p.id = profile_id;
$$;

revoke all on function private.is_public_list(text) from public, anon, authenticated;
revoke all on function private.public_lists_done(uuid) from public, anon, authenticated;
