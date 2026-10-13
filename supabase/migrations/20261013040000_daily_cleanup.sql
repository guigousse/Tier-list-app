-- TO RUN ONCE IN THE SUPABASE SQL EDITOR (needs confirmation, not applied yet):
-- removes share codes nobody opened for six months and old rate-limit counters,
-- every day at 03:17 UTC.
create or replace function private.cleanup()
returns void
language sql
set search_path = ''
as $$
  delete from public.shared_lists where coalesce(last_opened_at, created_at) < now() - interval '180 days';
  delete from private.rate_limits where window_start < now() - interval '1 day';
$$;

select cron.schedule('tiercraft-cleanup', '17 3 * * *', 'select private.cleanup()');
