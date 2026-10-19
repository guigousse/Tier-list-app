-- Tier lists sent to friends are deleted after 90 days, as the privacy policy says
-- (until now the app only stopped showing them). Run by the daily cleanup.

create or replace function private.cleanup()
returns void
language sql
set search_path = ''
as $$
  delete from public.shared_lists where coalesce(last_opened_at, created_at) < now() - interval '180 days';
  delete from public.list_mail where created_at < now() - interval '90 days';
  delete from private.rate_limits where window_start < now() - interval '1 day';
$$;
