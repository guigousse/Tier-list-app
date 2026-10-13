-- Tier lists shared by code. No direct access: only through the two functions below.
create table public.shared_lists (
  code text primary key check (code ~ '^[A-Z2-9]{6}$'),
  payload jsonb not null check (pg_column_size(payload) <= 65536),
  created_at timestamptz not null default now()
);
alter table public.shared_lists enable row level security;

-- Stores a tier list (same JSON format as the app's share links) and returns its code.
create or replace function public.share_list(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
begin
  if jsonb_typeof(payload) <> 'object' or payload->>'v' is null
     or jsonb_typeof(payload->'r') <> 'array' or jsonb_typeof(payload->'c') <> 'array' then
    raise exception 'invalid tier list';
  end if;
  if pg_column_size(payload) > 65536 then
    raise exception 'tier list too large';
  end if;
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.shared_lists (code, payload) values (new_code, payload);
      return new_code;
    exception when unique_violation then
      -- Extremely rare: try another code.
    end;
  end loop;
end;
$$;

-- Returns the tier list stored under `code`, or null.
create or replace function public.get_shared_list(code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select s.payload from public.shared_lists s where s.code = upper(get_shared_list.code);
$$;

revoke all on function public.share_list(jsonb) from public;
revoke all on function public.get_shared_list(text) from public;
grant execute on function public.share_list(jsonb) to anon, authenticated;
grant execute on function public.get_shared_list(text) to anon, authenticated;

-- Ready-to-rank templates published from the dashboard, shown next to the built-in ones.
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  emoji text not null default '✨',
  items text[] not null,
  tiers text[],
  published boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.templates enable row level security;
create policy "Published templates are public" on public.templates
  for select to anon, authenticated using (published);

-- One tier list per day. Rows dated in the future stay hidden until their day
-- (one day of slack so every time zone sees its own "today").
create table public.daily_lists (
  day date primary key,
  title text not null,
  emoji text not null default '📅',
  description text,
  items text[] not null,
  tiers text[],
  created_at timestamptz not null default now()
);
alter table public.daily_lists enable row level security;
create policy "Past and current daily lists are public" on public.daily_lists
  for select to anon, authenticated using (day <= (now() at time zone 'utc')::date + 1);

grant select on public.templates, public.daily_lists to anon, authenticated;
