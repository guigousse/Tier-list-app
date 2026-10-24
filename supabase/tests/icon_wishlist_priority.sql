-- The pictures of the next daily lists are drawn first (20261024160000_icon_wishlist_priority.sql).
-- Run on the project: the block always fails at the end, nothing kept. Expected error message: 'OK'.
do $$
declare
  queue text[];
begin
  insert into public.icon_wishlist (concept, label) values ('test-later-wish', 'later');
  insert into public.daily_lists (day, title, emoji, items, concepts) values
    (current_date + 3, 'Test B', '🧪', array['b1', 'b2'], array['test-b1', 'test-b2']),
    (current_date + 1, 'Test A', '🧪', array['a1', 'a2'], array['test-a1', 'test-b2']);
  insert into public.icon_wishlist (concept, label) values ('test-b1', 'b1'), ('test-b2', 'b2'), ('test-a1', 'a1');
  select array_agg(concept order by created_at) into queue from public.icon_wishlist where concept like 'test-%';
  -- test-b2 is in both lists: it comes with the first one, beside test-a1.
  if (select array_agg(c order by c) from unnest(queue[1:2]) c) <> array['test-a1', 'test-b2'] or queue[3:4] <> array['test-b1', 'test-later-wish'] then
    raise exception 'FAIL: queue = %', queue;
  end if;

  -- List A moved after B: its card goes behind B's; deleted lists leave the front.
  update public.daily_lists set day = current_date + 5 where title = 'Test A';
  select array_agg(concept order by created_at) into queue from public.icon_wishlist where concept like 'test-%';
  if (select array_agg(c order by c) from unnest(queue[1:2]) c) <> array['test-b1', 'test-b2'] or queue[3] <> 'test-a1' then raise exception 'FAIL: moved queue = %', queue; end if;
  delete from public.daily_lists where title like 'Test _';
  if exists (select 1 from public.icon_wishlist where concept like 'test-%' and created_at < '2001-01-01') then raise exception 'FAIL: wish left at the front'; end if;
  raise exception 'OK';
end;
$$;
