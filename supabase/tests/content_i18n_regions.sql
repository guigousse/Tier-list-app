-- Translated content and regional lists (20261019010000_content_i18n_regions.sql). Run on
-- the project: the block always fails at the end, nothing kept. Expected error: 'OK'.
do $$
declare
  dev uuid := gen_random_uuid();
  locked boolean;
  seen int;
begin
  insert into public.daily_lists (day, title, items, vote_regions) values ('2000-01-01', 'Élection test', array['A', 'B'], array['FR']);
  insert into public.templates (key, title, items, vote_regions) values ('zz-region-test', 'Élection test', array['A', 'B'], array['GR']);

  -- A French player votes on the French election; an American one cannot.
  perform set_config('request.headers', '{"cf-ipcountry":"US"}', true);
  begin
    perform public.submit_daily_vote('2000-01-01', dev, array[0, 1]::smallint[]);
    locked := false;
  exception when others then
    if sqlerrm <> 'region_locked' then raise exception 'FAIL: daily vote from US: %', sqlerrm; end if;
    locked := true;
  end;
  if not locked then raise exception 'FAIL: daily vote from US accepted'; end if;

  perform set_config('request.headers', '{"cf-ipcountry":"FR"}', true);
  perform public.submit_daily_vote('2000-01-01', dev, array[0, 1]::smallint[]);
  if not exists (select 1 from public.daily_votes where day = '2000-01-01' and device_id = dev) then
    raise exception 'FAIL: daily vote from FR not recorded';
  end if;

  -- Same for a template: Greek only.
  begin
    perform public.submit_list_vote('popular:zz-region-test:abc', dev, array[0, 1]::smallint[]);
    locked := false;
  exception when others then
    if sqlerrm <> 'region_locked' then raise exception 'FAIL: list vote from FR: %', sqlerrm; end if;
    locked := true;
  end;
  if not locked then raise exception 'FAIL: list vote from FR accepted'; end if;

  perform set_config('request.headers', '{"cf-ipcountry":"gr"}', true);
  perform public.submit_list_vote('popular:zz-region-test:abc', dev, array[0, 1]::smallint[]);

  -- An unknown country is refused on a restricted list.
  perform set_config('request.headers', '{}', true);
  begin
    perform public.submit_list_vote('popular:zz-region-test:abc', gen_random_uuid(), array[0, 1]::smallint[]);
    locked := false;
  exception when others then
    locked := sqlerrm = 'region_locked';
  end;
  if not locked then raise exception 'FAIL: list vote without country accepted'; end if;

  -- Translations: a future daily list stays hidden, a past one and a template are public.
  insert into public.content_translations (kind, key, lang, title) values
    ('daily', '2000-01-01', 'en', 'Test election'),
    ('daily', '2999-01-01', 'en', 'Future'),
    ('template', 'zz-region-test', 'el', 'Δοκιμή');
  execute 'set local role anon';
  select count(*) into seen from public.content_translations where key in ('2000-01-01', '2999-01-01', 'zz-region-test');
  execute 'reset role';
  if seen <> 2 then raise exception 'FAIL: % translations visible, expected 2', seen; end if;

  raise exception 'OK';
end $$;
