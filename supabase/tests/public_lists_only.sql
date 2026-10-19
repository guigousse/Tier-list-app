-- Lists path counts public tier lists only (20261017020000_public_lists_only.sql).
-- Run on the project: everything happens in a block that always fails at the end, so
-- nothing is kept. Expected error message: 'OK'; anything else names the check that failed.
do $$
declare
  d uuid := gen_random_uuid();
  fake_refused boolean := false;
  done integer;
begin
  -- A made-up list is refused: it can't feed the credits or the stats.
  begin
    perform public.submit_list_vote('popular:x-farm:1', d, '{0}');
  exception when others then
    fake_refused := sqlerrm = 'unknown list';
  end;
  if not fake_refused then raise exception 'FAIL: made-up list accepted'; end if;

  -- A public list counts once, even voted on two versions of its cards.
  perform public.submit_list_vote('popular:fruits:aaa', d, '{0}');
  perform public.submit_list_vote('popular:fruits:bbb', d, '{1}');
  -- A published template counts too.
  perform public.submit_list_vote('popular:' || (select key from public.templates where published limit 1) || ':zzz', d, '{0}');
  -- A past daily played later and the daily vote of that same day: one list.
  insert into public.daily_votes (day, device_id, ranks)
    select dl.day, d, array_fill(0::smallint, array[cardinality(dl.items)]) from public.daily_lists dl
    where dl.day <= current_date order by dl.day limit 1;
  perform public.submit_list_vote('popular:daily-' || (select min(day) from public.daily_lists) || ':ccc', d, '{0}');

  done := (public.restore_progress(d) ->> 'completed')::integer;
  if done <> 3 then raise exception 'FAIL: restore_progress completed = % (expected 3)', done; end if;
  done := private.public_lists_done(d);
  if done <> 3 then raise exception 'FAIL: public_lists_done = % (expected 3)', done; end if;

  raise exception 'OK';
end;
$$;
