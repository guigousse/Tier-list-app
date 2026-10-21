-- Lists sent to friends expire after 7 days without an answer (20261020190000_mail_expiry.sql).
-- Run on the project: the block always fails at the end, nothing kept. Expected error
-- message: 'OK'.
do $$
declare
  a_secret text := 'test-a-' || gen_random_uuid();
  b_secret text := 'test-b-' || gen_random_uuid();
  a uuid;
  b uuid;
  list jsonb := '{"v":1,"t":"Fruits","r":[["S","#ff7f7f"],["A","#ffbf7f"]],"c":[["Pomme","#fff",0],["Kiwi","#fff",1]]}';
  other jsonb := '{"v":1,"t":"Légumes","r":[["S","#ff7f7f"],["A","#ffbf7f"]],"c":[["Chou","#fff",0],["Poireau","#fff",1]]}';
  old uuid;
  kept uuid;
  r jsonb;
begin
  insert into public.profiles (device_id, secret_hash, pseudo, tag, avatar)
  values (gen_random_uuid(), encode(sha256(convert_to(a_secret, 'UTF8')), 'hex'), 'TestA', 9001, 'fox')
  returning id into a;
  insert into public.profiles (device_id, secret_hash, pseudo, tag, avatar)
  values (gen_random_uuid(), encode(sha256(convert_to(b_secret, 'UTF8')), 'hex'), 'TestB', 9002, 'fox')
  returning id into b;
  insert into public.friend_links (a, b, requester, status) values (least(a, b), greatest(a, b), a, 'accepted');

  -- Sent today: in both mailboxes.
  if public.send_list(a_secret, array[b], list) <> 1 then raise exception 'FAIL: not sent'; end if;
  select id into old from public.list_mail where sender = a and recipient = b;
  if jsonb_array_length(public.get_mail(b_secret)->'inbox') <> 1 then raise exception 'FAIL: not received'; end if;

  -- 8 days without an answer: gone from both mailboxes, cannot be ranked.
  update public.list_mail set created_at = now() - interval '8 days' where id = old;
  if jsonb_array_length(public.get_mail(b_secret)->'inbox') <> 0 then raise exception 'FAIL: still received'; end if;
  if jsonb_array_length(public.get_mail(a_secret)->'outbox') <> 0 then raise exception 'FAIL: still pending'; end if;
  begin
    perform public.answer_mail(b_secret, old, array[0, 1]::smallint[]);
    raise exception 'FAIL: expired list ranked';
  exception when others then
    if sqlerrm <> 'mail expired' then raise exception 'FAIL: answer %', sqlerrm; end if;
  end;

  -- It can be sent again.
  if public.mail_sent_to(a_secret, list) <> '[]'::jsonb then raise exception 'FAIL: still counted as sent'; end if;
  if public.send_list(a_secret, array[b], list) <> 1 then raise exception 'FAIL: not sent again'; end if;

  -- A list ranked in time stays in the archives, even after months.
  perform public.send_list(a_secret, array[b], other);
  select id into kept from public.list_mail where sender = a and payload->>'t' = 'Légumes';
  perform public.answer_mail(b_secret, kept, array[0, 1]::smallint[]);
  update public.list_mail set created_at = now() - interval '200 days' where id = kept;
  r := public.get_mail(a_secret);
  if not exists (select 1 from jsonb_array_elements(r->'outbox') m where m->>'id' = kept::text) then raise exception 'FAIL: ranked list hidden'; end if;

  -- The cleanup deletes the expired one, keeps the ranked one.
  perform private.cleanup();
  if exists (select 1 from public.list_mail where id = old) then raise exception 'FAIL: expired list kept'; end if;
  if not exists (select 1 from public.list_mail where id = kept) then raise exception 'FAIL: ranked list deleted'; end if;

  raise exception 'OK';
end $$;
