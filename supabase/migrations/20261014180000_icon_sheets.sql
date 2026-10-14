-- AI card icons drawn in sheets (Gemini, one image per list, cut on the server):
-- each icon is a PNG in the public bucket `card-icons`, its URL in card_icons.image.
-- Earlier icons were SVG text; a concept now has either one, or both.
alter table public.card_icons alter column svg drop not null;
alter table public.card_icons add column if not exists image text;

-- Concepts proposed by the AI but not drawn yet: a sheet costs the same with 3 icons
-- or 12, so its free cells draw these ahead, for the next players.
create table if not exists public.icon_wishlist (
  concept text primary key,
  label text,
  created_at timestamptz not null default now()
);
alter table public.icon_wishlist enable row level security;

insert into storage.buckets (id, name, public)
values ('card-icons', 'card-icons', true)
on conflict (id) do nothing;
