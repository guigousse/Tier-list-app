-- The icon library redrawn as die-cut stickers (white border kept, files "…-sticker.png"),
-- sheet by sheet, by the ai-generate function's admin action "redraw". Each older
-- picture remembers the one that replaces it, so the cards already in players' lists
-- (which keep a picture's URL) move to the new one when the app opens.
alter table public.card_icon_images add column if not exists replaced_by text;

create or replace function public.get_icon_replacements(images text[])
 returns table(image text, replaced_by text)
 language plpgsql
 -- Volatile: the rate limit writes its counter (a stable function runs read-only).
 volatile
 security definer
 set search_path to ''
as $$
begin
  perform private.hit('get_icon_replacements', 60);
  return query
    select i.image, i.replaced_by from public.card_icon_images i
    where i.image = any (get_icon_replacements.images[1:1000]) and i.replaced_by is not null;
end;
$$;
revoke all on function public.get_icon_replacements(text[]) from public;
grant execute on function public.get_icon_replacements(text[]) to anon, authenticated;

-- The admin action's key: only its SHA-256 is kept (inserted by hand, never in a file),
-- checked by the function with the service role.
create table if not exists private.admin_tokens (token_hash text primary key, created_at timestamptz not null default now());

create or replace function public.admin_token_ok(token text)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $$
  select exists (select 1 from private.admin_tokens where token_hash = encode(extensions.digest(token, 'sha256'), 'hex'));
$$;
revoke all on function public.admin_token_ok(text) from public, anon, authenticated;
grant execute on function public.admin_token_ok(text) to service_role;
