-- Avatars with face shape, eye shape, eyebrows, mouth and facial hair: the code
-- now has 12 parts ("a2-oval-p2-long-blond-lashes-blue-thin-smile-none-none-round-violet").
-- The first codes (a1, 8 parts) and the emoji avatars stay accepted.

create or replace function private.check_avatar(avatar text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if avatar ~ '^a2(-[a-z0-9]{1,12}){12}$' or avatar ~ '^a1(-[a-z0-9]{1,12}){8}$' then
    return avatar;
  end if;
  if not (avatar = any (array['🦊', '🐼', '🐸', '🐙', '🦁', '🐯', '🐨', '🐵', '🦄', '🐲', '🦉', '🐧', '🐳', '🦖', '👾', '🤖', '👻', '🎃', '🌵', '🍄', '🔥', '⚡', '🌈', '👑'])) then
    raise exception 'invalid avatar';
  end if;
  return avatar;
end;
$$;
