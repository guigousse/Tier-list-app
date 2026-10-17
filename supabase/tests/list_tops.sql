-- The favourite card of each public list (20261017050000_list_tops.sql): the one most
-- often ranked S. Run on the project: the block always fails at the end, nothing kept.
-- Expected error message: 'OK'.
do $$
declare
  tops jsonb;
begin
  -- Six players put card 12 in S (more than the real votes of the list), the rest in D.
  for i in 1..6 loop
    perform public.submit_list_vote('popular:fruits:t' || i, gen_random_uuid(),
      (select array_agg(case when g = 12 then 0 else 4 end order by g)::smallint[] from generate_series(0, 19) g));
  end loop;
  select jsonb_object_agg(t.template_key, t.top) into tops from public.get_list_tops() t;
  if (tops ->> 'fruits')::int <> 12 then raise exception 'FAIL: fruits top = % (expected 12)', tops ->> 'fruits'; end if;
  raise exception 'OK';
end;
$$;
