-- Notifications in the receiver's language (20261019020000_push_languages.sql). Run on the
-- project: the block always fails at the end, nothing kept. Expected error message: 'OK'.
do $$
declare
  got text;
begin
  if (select column_default from information_schema.columns where table_name = 'profiles' and column_name = 'language') <> '''fr''::text' then
    raise exception 'FAIL: profiles made before the languages stay French';
  end if;

  got := private.push_text('el', 'agree.title', 'Nikos');
  if got <> 'Nikos συμφωνεί μαζί σας 🤝' then raise exception 'FAIL: greek text %', got; end if;
  got := private.push_text('de', 'mail.title', 'Hans');
  if got <> 'Hans vous a envoyé une tier list 📬' then raise exception 'FAIL: unknown language falls back to French: %', got; end if;

  got := (private.agreement_message_in('Ana', 'Fruits', 40, 'en'))[2];
  if got <> 'Ana ranked “Fruits”: only 40% agreement. See who’s right!' then raise exception 'FAIL: english agreement %', got; end if;

  got := private.list_title_in('popular:fruits:abc', 'el');
  if got is null or got = 'Fruits' then raise exception 'FAIL: built-in list title in Greek: %', got; end if;
  got := private.list_title_in('popular:fruits:abc', 'fr');
  if got <> 'Fruits' then raise exception 'FAIL: built-in list title in French: %', got; end if;
  got := private.list_title_in('daily:2026-10-13', 'es');
  if got <> 'Ingredientes de pizza' then raise exception 'FAIL: daily list title in Spanish: %', got; end if;
  got := private.list_title_in('popular:nope:x', 'el');
  if got <> 'μια tier list' then raise exception 'FAIL: unknown list %', got; end if;

  raise exception 'OK';
end $$;
