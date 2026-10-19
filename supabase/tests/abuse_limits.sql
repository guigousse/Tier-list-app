-- Sandbox purchases, reports and moderation (20261017030000_abuse_limits.sql).
-- Run on the project: the block always fails at the end, so nothing is kept.
-- Expected error message: 'OK'; anything else names the check that failed.
do $$
declare
  w text := md5(random()::text) || md5(random()::text);
  refused boolean := false;
  victim uuid;
  r text[];
  i integer;
  word text;
begin
  -- Sandbox purchases (TestFlight, free) credit 2000 at most a month; real ones aren't capped.
  perform public.wallet_open(w);
  perform public.wallet_purchase(w, 'test-sb-1', 'tiercraft.energy.1750', 1750, 'Sandbox');
  begin
    perform public.wallet_purchase(w, 'test-sb-2', 'tiercraft.energy.1750', 1750, 'Sandbox');
  exception when others then
    refused := sqlerrm = 'sandbox limit';
  end;
  if not refused then raise exception 'FAIL: sandbox credits not capped'; end if;
  perform public.wallet_purchase(w, 'test-prod-1', 'tiercraft.energy.1750', 1750, 'Production');
  perform public.wallet_purchase(w, 'test-prod-2', 'tiercraft.energy.1750', 1750, 'Production');

  -- Three brand-new accounts that never heard from a player can't hide them.
  victim := (public.create_profile(gen_random_uuid(), repeat('v', 40), 'Victime', 'a2-round-p3-quiff-chestnut-round-green-thick-grin-short-headphones-round-sky') ->> 'id')::uuid;
  for i in 1..3 loop
    r[i] := repeat(chr(96 + i), 40);
    perform public.create_profile(gen_random_uuid(), r[i], 'Faux ' || i, 'a2-round-p3-quiff-chestnut-round-green-thick-grin-short-headphones-round-sky');
    perform public.report_player(r[i], victim, 'pseudo');
  end loop;
  if (select hidden from public.profiles where id = victim) then raise exception 'FAIL: hidden by 3 new accounts'; end if;
  -- Even old ones, without a contact: still not hidden.
  update public.profiles set created_at = now() - interval '10 days' where secret_hash in (select encode(sha256(convert_to(x, 'UTF8')), 'hex') from unnest(r) x);
  perform public.report_player(r[1], victim, 'pseudo');
  if (select hidden from public.profiles where id = victim) then raise exception 'FAIL: hidden without any contact'; end if;

  -- Three established players the victim wrote to: hidden.
  for i in 4..6 loop
    r[i] := repeat(chr(96 + i), 40);
    perform public.create_profile(gen_random_uuid(), r[i], 'Joueur ' || i, 'a2-round-p3-quiff-chestnut-round-green-thick-grin-short-headphones-round-sky');
    update public.profiles set created_at = now() - interval '10 days' where secret_hash = encode(sha256(convert_to(r[i], 'UTF8')), 'hex');
    perform public.send_friend_request(repeat('v', 40), 'Joueur ' || i, (select tag from public.profiles where secret_hash = encode(sha256(convert_to(r[i], 'UTF8')), 'hex')));
    perform public.report_player(r[i], victim, 'pseudo');
  end loop;
  if not (select hidden from public.profiles where id = victim) then raise exception 'FAIL: not hidden by 3 real reports'; end if;

  -- Look-alike letters: Cyrillic and full-width are read as the Latin ones.
  select b.word into word from private.banned_words b where not b.whole and b.word ~ '^[a-z]{4,}$' and b.word ~ '[aeo]' limit 1;
  if not private.is_offensive(translate(word, 'aeo', 'аео')) then raise exception 'FAIL: Cyrillic look-alikes pass'; end if;
  if not private.is_offensive(translate(word, 'abcdefghijklmnopqrstuvwxyz', 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ')) then raise exception 'FAIL: full-width passes'; end if;
  refused := false;
  begin
    perform private.clean_pseudo('Sаlut');
  exception when others then
    refused := sqlerrm = 'invalid pseudo';
  end;
  if not refused then raise exception 'FAIL: Cyrillic pseudo accepted'; end if;
  if private.clean_pseudo('Léa_Œuvre-2') <> 'Léa_Œuvre-2' then raise exception 'FAIL: French pseudo refused'; end if;

  raise exception 'OK';
end;
$$;
