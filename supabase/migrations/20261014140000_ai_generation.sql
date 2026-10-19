-- AI tier list generation (edge function `ai-generate`): the shared library of
-- generated card icons, and per-device / global daily quotas so the AI bill stays
-- bounded. Only the edge function (service role) reads and writes these.

create table if not exists public.card_icons (
  concept text primary key,                -- English slug, e.g. "hiking-boot"
  svg text not null check (length(svg) <= 16000),
  label text,                              -- first card name it was drawn for
  created_at timestamptz not null default now()
);
alter table public.card_icons enable row level security;

create table if not exists public.ai_usage (
  device_id uuid not null,
  kind text not null check (kind in ('words', 'icon')),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_recent on public.ai_usage (created_at);
create index if not exists ai_usage_device on public.ai_usage (device_id, kind, created_at);
alter table public.ai_usage enable row level security;

-- Records one generation if the device and the whole app are under today's limits.
create or replace function public.ai_allow(device_id uuid, kind text)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  per_device int := case kind when 'words' then 30 else 200 end;
  global int := case kind when 'words' then 3000 else 3000 end;
begin
  if (select count(*) from public.ai_usage u
      where u.device_id = ai_allow.device_id and u.kind = ai_allow.kind and u.created_at > now() - interval '1 day') >= per_device
     or (select count(*) from public.ai_usage u
      where u.kind = ai_allow.kind and u.created_at > now() - interval '1 day') >= global then
    return false;
  end if;
  insert into public.ai_usage (device_id, kind) values (ai_allow.device_id, ai_allow.kind);
  return true;
end;
$function$;

revoke all on function public.ai_allow(uuid, text) from public, anon, authenticated;
grant execute on function public.ai_allow(uuid, text) to service_role;
