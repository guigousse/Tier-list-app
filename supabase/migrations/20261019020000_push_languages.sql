-- Push notifications in the language of the player who receives them.

-- The app's language, sent by the app (set_language); French for profiles made before.
alter table public.profiles add column language text not null default 'fr' check (language in ('fr', 'en', 'es', 'el'));

create or replace function public.set_language(secret text, language text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.me(secret);
begin
  perform private.hit('set_language', 30);
  if set_language.language not in ('fr', 'en', 'es', 'el') then
    raise exception 'invalid language';
  end if;
  update public.profiles p set language = set_language.language where p.id = me;
end;
$$;
revoke all on function public.set_language(text, text) from public;
grant execute on function public.set_language(text, text) to anon, authenticated;

-- Names of the built-in lists (they live in the app), for the notifications' titles.
insert into public.content_translations (kind, key, lang, title) values
  ('builtin', 'mobile-games', 'en', 'Mobile Games'),
  ('builtin', 'fruits', 'en', 'Fruits'),
  ('builtin', 'desserts', 'en', 'Desserts'),
  ('builtin', 'animals', 'en', 'Animals'),
  ('builtin', 'sports', 'en', 'Sports'),
  ('builtin', 'seasons', 'en', 'Seasons & Holidays'),
  ('builtin', 'food', 'en', 'Food'),
  ('builtin', 'vegetables', 'en', 'Vegetables'),
  ('builtin', 'drinks', 'en', 'Drinks'),
  ('builtin', 'cheeses', 'en', 'Cheeses'),
  ('builtin', 'breakfast', 'en', 'Breakfast'),
  ('builtin', 'destinations', 'en', 'Destinations'),
  ('builtin', 'boardgames', 'en', 'Board Games'),
  ('builtin', 'movie-genres', 'en', 'Movie Genres'),
  ('builtin', 'music-genres', 'en', 'Music Genres'),
  ('builtin', 'instruments', 'en', 'Instruments'),
  ('builtin', 'transport', 'en', 'Transportation'),
  ('builtin', 'superpowers', 'en', 'Superpowers'),
  ('builtin', 'weekend', 'en', 'Weekend Activities'),
  ('builtin', 'school', 'en', 'School Subjects'),
  ('builtin', 'mobile-games', 'es', 'Juegos móviles'),
  ('builtin', 'fruits', 'es', 'Frutas'),
  ('builtin', 'desserts', 'es', 'Postres'),
  ('builtin', 'animals', 'es', 'Animales'),
  ('builtin', 'sports', 'es', 'Deportes'),
  ('builtin', 'seasons', 'es', 'Estaciones y fiestas'),
  ('builtin', 'food', 'es', 'Platos'),
  ('builtin', 'vegetables', 'es', 'Verduras'),
  ('builtin', 'drinks', 'es', 'Bebidas'),
  ('builtin', 'cheeses', 'es', 'Quesos'),
  ('builtin', 'breakfast', 'es', 'Desayuno'),
  ('builtin', 'destinations', 'es', 'Destinos'),
  ('builtin', 'boardgames', 'es', 'Juegos de mesa'),
  ('builtin', 'movie-genres', 'es', 'Géneros de cine'),
  ('builtin', 'music-genres', 'es', 'Estilos de música'),
  ('builtin', 'instruments', 'es', 'Instrumentos'),
  ('builtin', 'transport', 'es', 'Transportes'),
  ('builtin', 'superpowers', 'es', 'Superpoderes'),
  ('builtin', 'weekend', 'es', 'Planes de fin de semana'),
  ('builtin', 'school', 'es', 'Asignaturas'),
  ('builtin', 'mobile-games', 'el', 'Παιχνίδια κινητού'),
  ('builtin', 'fruits', 'el', 'Φρούτα'),
  ('builtin', 'desserts', 'el', 'Επιδόρπια'),
  ('builtin', 'animals', 'el', 'Ζώα'),
  ('builtin', 'sports', 'el', 'Αθλήματα'),
  ('builtin', 'seasons', 'el', 'Εποχές & γιορτές'),
  ('builtin', 'food', 'el', 'Φαγητά'),
  ('builtin', 'vegetables', 'el', 'Λαχανικά'),
  ('builtin', 'drinks', 'el', 'Ποτά'),
  ('builtin', 'cheeses', 'el', 'Τυριά'),
  ('builtin', 'breakfast', 'el', 'Πρωινό'),
  ('builtin', 'destinations', 'el', 'Προορισμοί'),
  ('builtin', 'boardgames', 'el', 'Επιτραπέζια'),
  ('builtin', 'movie-genres', 'el', 'Είδη ταινιών'),
  ('builtin', 'music-genres', 'el', 'Μουσικά είδη'),
  ('builtin', 'instruments', 'el', 'Μουσικά όργανα'),
  ('builtin', 'transport', 'el', 'Μεταφορικά μέσα'),
  ('builtin', 'superpowers', 'el', 'Υπερδυνάμεις'),
  ('builtin', 'weekend', 'el', 'Ασχολίες Σαββατοκύριακου'),
  ('builtin', 'school', 'el', 'Σχολικά μαθήματα')
on conflict (kind, key, lang) do update set title = excluded.title, updated_at = now();

-- The texts of the notifications: {p} the friend's pseudo, {t} the list, {s} the agreement.
create table private.push_texts (
  lang text not null,
  key text not null,
  text text not null,
  primary key (lang, key)
);
insert into private.push_texts (lang, key, text) values
  ('fr', 'disagree.title', '{p} n’est pas d’accord avec vous ⚔️'),
  ('fr', 'disagree.body', '{p} a classé « {t} » : seulement {s} % d’accord. Voyez qui a raison !'),
  ('fr', 'agree.title', '{p} est d’accord avec vous 🤝'),
  ('fr', 'agree.body', '{p} a classé « {t} » : {s} % d’accord.'),
  ('fr', 'ranked.title', '{p} a classé « {t} »'),
  ('fr', 'ranked.body', '{s} % d’accord avec vous. Comparez vos classements !'),
  ('fr', 'mail.title', '{p} vous a envoyé une tier list 📬'),
  ('fr', 'mail.ranked', '« {t} » : vous l’aviez déjà classée, comparez vos classements !'),
  ('fr', 'mail.new', '« {t} » : classez-la et comparez vos goûts.'),
  ('fr', 'list', 'une tier list'),
  ('en', 'disagree.title', '{p} disagrees with you ⚔️'),
  ('en', 'disagree.body', '{p} ranked “{t}”: only {s}% agreement. See who’s right!'),
  ('en', 'agree.title', '{p} agrees with you 🤝'),
  ('en', 'agree.body', '{p} ranked “{t}”: {s}% agreement.'),
  ('en', 'ranked.title', '{p} ranked “{t}”'),
  ('en', 'ranked.body', '{s}% agreement with you. Compare your rankings!'),
  ('en', 'mail.title', '{p} sent you a tier list 📬'),
  ('en', 'mail.ranked', '“{t}”: you already ranked it, compare your rankings!'),
  ('en', 'mail.new', '“{t}”: rank it and compare your tastes.'),
  ('en', 'list', 'a tier list'),
  ('es', 'disagree.title', '{p} no está de acuerdo contigo ⚔️'),
  ('es', 'disagree.body', '{p} clasificó «{t}»: solo un {s} % de acuerdo. ¡Mira quién tiene razón!'),
  ('es', 'agree.title', '{p} está de acuerdo contigo 🤝'),
  ('es', 'agree.body', '{p} clasificó «{t}»: {s} % de acuerdo.'),
  ('es', 'ranked.title', '{p} clasificó «{t}»'),
  ('es', 'ranked.body', '{s} % de acuerdo contigo. ¡Compara las clasificaciones!'),
  ('es', 'mail.title', '{p} te envió una tier list 📬'),
  ('es', 'mail.ranked', '«{t}»: ya la habías clasificado, ¡compara las clasificaciones!'),
  ('es', 'mail.new', '«{t}»: clasifícala y compara gustos.'),
  ('es', 'list', 'una tier list'),
  ('el', 'disagree.title', '{p} διαφωνεί μαζί σας ⚔️'),
  ('el', 'disagree.body', '{p} κατέταξε «{t}»: μόνο {s} % συμφωνία. Δείτε ποιος έχει δίκιο!'),
  ('el', 'agree.title', '{p} συμφωνεί μαζί σας 🤝'),
  ('el', 'agree.body', '{p} κατέταξε «{t}»: {s} % συμφωνία.'),
  ('el', 'ranked.title', '{p} κατέταξε «{t}»'),
  ('el', 'ranked.body', '{s} % συμφωνία μαζί σας. Συγκρίνετε τις κατατάξεις σας!'),
  ('el', 'mail.title', '{p} σας έστειλε μια tier list 📬'),
  ('el', 'mail.ranked', '«{t}»: την είχατε ήδη κατατάξει, συγκρίνετε τις κατατάξεις σας!'),
  ('el', 'mail.new', '«{t}»: κατατάξτε τη και συγκρίνετε τα γούστα σας.'),
  ('el', 'list', 'μια tier list');

-- A notification text in `lang` (French when missing), its placeholders filled.
create or replace function private.push_text(lang text, key text, pseudo text default '', title text default '', score integer default 0)
returns text
language sql
stable
set search_path = ''
as $$
  select replace(replace(replace(
    coalesce((select x.text from private.push_texts x where x.lang = push_text.lang and x.key = push_text.key),
             (select x.text from private.push_texts x where x.lang = 'fr' and x.key = push_text.key)),
    '{p}', coalesce(pseudo, '')), '{t}', coalesce(title, '')), '{s}', score::text);
$$;

-- A public list's title in `lang`: translated when it can be, French otherwise. A new name
-- next to list_title(key): a default argument would make calls to the old one ambiguous.
create or replace function private.list_title_in(key text, lang text)
returns text
language sql
stable security definer
set search_path = ''
as $$
  select coalesce(
    case
      when list_title_in.key like 'daily:%' then coalesce(
        (select c.title from public.content_translations c where c.kind = 'daily' and c.key = substr(list_title_in.key, 7) and c.lang = list_title_in.lang),
        (select d.title from public.daily_lists d where d.day::text = substr(list_title_in.key, 7)))
      else coalesce(
        (select c.title from public.content_translations c
          where c.kind in ('template', 'builtin') and c.key = split_part(list_title_in.key, ':', 2) and c.lang = list_title_in.lang
          order by c.kind = 'template' desc limit 1),
        (select t.title from public.templates t where t.key = split_part(list_title_in.key, ':', 2)),
        (select b.title from private.builtin_titles b where b.key = split_part(list_title_in.key, ':', 2)))
    end,
    private.push_text(list_title_in.lang, 'list'));
$$;

create or replace function private.agreement_message_in(pseudo text, list_title text, score integer, lang text)
returns text[]
language sql
stable
set search_path = ''
as $$
  select array[private.push_text(lang, k || '.title', pseudo, list_title, score), private.push_text(lang, k || '.body', pseudo, list_title, score)]
  from (select case when score < 60 then 'disagree' when score >= 85 then 'agree' else 'ranked' end as k) m;
$$;

create or replace function private.notify_friend_vote(voter_device uuid, vote_key text, ranks smallint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  voter public.profiles;
  friend record;
  msg text[];
begin
  select * into voter from public.profiles p where p.device_id = voter_device;
  if voter.id is null or voter.hidden then
    return;
  end if;
  for friend in
    select p.id, p.language, coalesce(lv.ranks, dv.ranks) as their_ranks
    from public.friend_links fl
    join public.profiles p on p.id = case when fl.a = voter.id then fl.b else fl.a end
    left join public.list_votes lv on vote_key not like 'daily:%' and lv.list_key = vote_key and lv.device_id = p.device_id
    left join public.daily_votes dv on vote_key like 'daily:%' and dv.day::text = substr(vote_key, 7) and dv.device_id = p.device_id
    where (fl.a = voter.id or fl.b = voter.id) and fl.status = 'accepted' and p.push_token is not null
      and coalesce(lv.ranks, dv.ranks) is not null and not private.is_blocked(voter.id, p.id)
  loop
    msg := private.agreement_message_in(voter.pseudo, private.list_title_in(vote_key, friend.language), private.agreement(ranks, friend.their_ranks, 5), friend.language);
    perform private.push(friend.id, msg[1], msg[2], jsonb_build_object('type', 'friend_vote', 'friend', voter.id, 'key', vote_key));
  end loop;
exception when others then
  null;
end;
$$;

-- The list's title here is the one its sender gave: their words, never translated.
create or replace function private.on_mail()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender public.profiles := (select p from public.profiles p where p.id = new.sender);
  recipient public.profiles := (select p from public.profiles p where p.id = new.recipient);
  list_title text := new.payload->>'t';
  score integer;
  msg text[];
  data jsonb := jsonb_build_object('type', 'mail', 'id', new.id);
begin
  if tg_op = 'INSERT' then
    perform private.push(new.recipient, private.push_text(recipient.language, 'mail.title', sender.pseudo),
      private.push_text(recipient.language, case when new.status = 'ranked' then 'mail.ranked' else 'mail.new' end, '', list_title),
      data);
  end if;
  if new.status = 'ranked' and (tg_op = 'INSERT' or old.status is distinct from 'ranked') then
    score := private.agreement(new.sender_ranks, new.recipient_ranks, jsonb_array_length(new.payload->'r'));
    msg := private.agreement_message_in(recipient.pseudo, list_title, score, sender.language);
    perform private.push(new.sender, msg[1], msg[2], data);
  end if;
  return null;
exception when others then
  return null;
end;
$$;
