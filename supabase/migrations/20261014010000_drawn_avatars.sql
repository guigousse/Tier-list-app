-- Drawn avatars: the app stores a short code of the chosen look
-- ("a1-f-p2-long-blond-blue-none-round-violet": body, skin, hair, hair colour,
-- eyes, hat, glasses, background). Only letters, digits and dashes, so it can't
-- carry text; the emoji avatars of earlier versions stay accepted.

alter table public.profiles drop constraint profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (char_length(avatar) between 1 and 120);

create or replace function private.check_avatar(avatar text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if avatar ~ '^a1(-[a-z0-9]{1,12}){8}$' then
    return avatar;
  end if;
  if not (avatar = any (array['🦊', '🐼', '🐸', '🐙', '🦁', '🐯', '🐨', '🐵', '🦄', '🐲', '🦉', '🐧', '🐳', '🦖', '👾', '🤖', '👻', '🎃', '🌵', '🍄', '🔥', '⚡', '🌈', '👑'])) then
    raise exception 'invalid avatar';
  end if;
  return avatar;
end;
$$;
