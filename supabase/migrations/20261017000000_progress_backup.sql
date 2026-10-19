-- Progress kept after a reinstall (src/lib/progress.ts). The phone's tier lists are lost
-- when the app is deleted, but the identity comes back through the Keychain, and with it
-- the device's votes: the server gives back the lists completed (counted as for the
-- credits of the path, wallet_milestones) and the days of the daily tier list played,
-- for the flame. VS choices are kept here too, one per fork and for good.

create table public.badge_choices (
  device_id uuid not null,
  fork text not null check (fork ~ '^[a-z_]{1,20}$'),
  badge text not null check (badge ~ '^[a-z_]{1,20}$'),
  created_at timestamptz not null default now(),
  primary key (device_id, fork)
);
alter table public.badge_choices enable row level security;
revoke all on public.badge_choices from anon, authenticated;

-- Keeps a VS choice; the first one stays, as in the app.
create or replace function public.save_badge_choice(device_id uuid, fork text, badge text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  perform private.hit('save_badge_choice', 30);
  insert into public.badge_choices (device_id, fork, badge)
  values (save_badge_choice.device_id, save_badge_choice.fork, save_badge_choice.badge)
  on conflict do nothing;
end;
$$;

-- What the server knows of a device's progress.
create or replace function public.restore_progress(device_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $$
begin
  perform private.hit('restore_progress', 30);
  return jsonb_build_object(
    'completed',
      (select count(*) from public.list_votes lv where lv.device_id = restore_progress.device_id and lv.list_key like 'popular:%')
      + (select count(*) from public.daily_votes dv where dv.device_id = restore_progress.device_id),
    'days',
      coalesce((select jsonb_agg(dv.day order by dv.day) from public.daily_votes dv where dv.device_id = restore_progress.device_id), '[]'::jsonb),
    'choices',
      coalesce((select jsonb_object_agg(bc.fork, bc.badge) from public.badge_choices bc where bc.device_id = restore_progress.device_id), '{}'::jsonb)
  );
end;
$$;

revoke all on function public.save_badge_choice(uuid, text, text) from public;
revoke all on function public.restore_progress(uuid) from public;
grant execute on function public.save_badge_choice(uuid, text, text) to anon, authenticated;
grant execute on function public.restore_progress(uuid) to anon, authenticated;
