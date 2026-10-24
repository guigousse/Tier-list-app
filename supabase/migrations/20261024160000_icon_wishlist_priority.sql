-- The free cells of the icon sheets draw icon_wishlist oldest first (ai-generate orders it
-- by created_at). To draw first the pictures the next daily tier lists need, a concept used
-- by an upcoming daily list is dated in the year 2000, shifted by its first day of use: those
-- come before every other wish, the soonest day first. The others keep their real date.

-- First upcoming day a concept is shown in a daily list, as a wishlist date (null: none).
create or replace function private.icon_wishlist_due(wanted text)
 returns timestamptz
 language sql
 stable
 set search_path = ''
as $$
  select timestamptz '2000-01-01 00:00+00' + (min(d.day) - date '2026-01-01') * interval '1 day'
  from public.daily_lists d
  where d.day >= current_date and wanted = any (d.concepts);
$$;

-- A new wish needed by a daily list goes to its place in the queue.
create or replace function private.icon_wishlist_place()
 returns trigger
 language plpgsql
 set search_path = ''
as $$
begin
  new.created_at := coalesce(private.icon_wishlist_due(new.concept), new.created_at);
  return new;
end;
$$;

drop trigger if exists icon_wishlist_place on public.icon_wishlist;
create trigger icon_wishlist_place before insert on public.icon_wishlist
  for each row execute function private.icon_wishlist_place();

-- After the daily lists change (written, moved, deleted): every wish takes its new place.
-- A wish no upcoming list needs any more leaves the front for the end of the queue.
create or replace function private.icon_wishlist_reorder()
 returns trigger
 language plpgsql
 set search_path = ''
as $$
begin
  update public.icon_wishlist w
  set created_at = coalesce(private.icon_wishlist_due(w.concept), case when w.created_at < timestamptz '2001-01-01 00:00+00' then now() else w.created_at end)
  where w.created_at is distinct from coalesce(private.icon_wishlist_due(w.concept), case when w.created_at < timestamptz '2001-01-01 00:00+00' then now() else w.created_at end);
  return null;
end;
$$;

drop trigger if exists icon_wishlist_reorder on public.daily_lists;
create trigger icon_wishlist_reorder after insert or update or delete on public.daily_lists
  for each statement execute function private.icon_wishlist_reorder();

-- The queue as it stands today.
update public.icon_wishlist w set created_at = private.icon_wishlist_due(w.concept)
where private.icon_wishlist_due(w.concept) is not null;
