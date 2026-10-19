-- Every picture drawn for a concept, the first one and the redraws a player asked for.
-- card_icons.image stays the one reused by default (other players' lists point to it);
-- the redraws are kept here, ready to be offered as alternatives.
create table if not exists public.card_icon_images (
  image text primary key,
  concept text not null,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists card_icon_images_concept on public.card_icon_images (concept);
alter table public.card_icon_images enable row level security;

insert into public.card_icon_images (image, concept, label, created_at)
select image, concept, label, created_at from public.card_icons where image is not null
on conflict (image) do nothing;
