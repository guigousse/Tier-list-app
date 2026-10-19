-- Public lists where every card was a good one left their bottom ranks empty: each one
-- gets a few cards meant for the bottom (weak, tiresome or absurd choices). Cards are
-- only appended, never renamed nor reordered: players' copies find their cards by name
-- (src/lib/publicSync.ts) and the favourite card is an index (get_list_tops). Run twice,
-- nothing is appended twice.

update public.templates set
  items = items || array['🍹 Baba au rhum', '🥧 Tarte aux pruneaux']::text[],
  concepts = concepts || array['rum-baba', 'prune-tart']::text[]
where key = 'pastries' and not ('🍹 Baba au rhum' = any (items));

update public.templates set
  items = items || array['🖱️ Clicker', '🎰 Gacha']::text[],
  concepts = concepts || array['computer-mouse', 'gacha-capsule']::text[]
where key = 'video-game-genres' and not ('🖱️ Clicker' = any (items));

-- Concepts of the new cards (here and in src/constants/presets.ts) not drawn yet: free
-- cells of later sheets draw them, the emoji standing in until then.
insert into public.icon_wishlist (concept, label)
select w.concept, w.label from (values
  ('durian', 'Durian'),
  ('quince', 'Coing'),
  ('grapefruit', 'Pamplemousse'),
  ('redcurrant', 'Groseille'),
  ('semolina-cake', 'Gâteau de semoule'),
  ('pudding', 'Pudding'),
  ('rum-baba', 'Baba au rhum'),
  ('canned-fruit', 'Fruits au sirop'),
  ('spider', 'Araignée'),
  ('cockroach', 'Cafard'),
  ('mosquito', 'Moustique'),
  ('rat', 'Rat'),
  ('jellyfish', 'Méduse'),
  ('alarm-clock', 'Changement d’heure'),
  ('calculator', 'Déclaration d’impôts'),
  ('andouillette-sausage', 'Andouillette'),
  ('tripe-stew', 'Tripes'),
  ('calf-head-plate', 'Tête de veau'),
  ('canned-ravioli', 'Raviolis en boîte'),
  ('turnip', 'Navet'),
  ('endive', 'Endive cuite'),
  ('celery', 'Céleri'),
  ('tomato-juice', 'Jus de tomate'),
  ('instant-coffee-jar', 'Café soluble'),
  ('kombucha-jar', 'Kombucha'),
  ('cheddar-square', 'Cheddar en tranche'),
  ('grated-cheese-bag', 'Râpé en sachet'),
  ('rusk', 'Biscottes'),
  ('stale-bread', 'Pain rassis'),
  ('goose', 'Jeu de l’oie'),
  ('card-stack', 'Bataille'),
  ('bingo-card', 'Loto'),
  ('christma-tree', 'Téléfilm de Noël'),
  ('shark', 'Nanar'),
  ('elevator', 'Musique d’ascenseur'),
  ('megaphone', 'Jingle de pub'),
  ('recorder-flute', 'Flûte à bec'),
  ('vuvuzela', 'Vuvuzela'),
  ('musical-triangle', 'Triangle'),
  ('kazoo', 'Kazoo'),
  ('unicycle', 'Monocycle'),
  ('donkey', 'Âne'),
  ('night-bus', 'Car de nuit'),
  ('pigeon', 'Parler aux pigeons'),
  ('light-stick', 'Briller dans le noir'),
  ('shrinking-potion', 'Rétrécir sans retour'),
  ('ear', 'Tout entendre sans arrêt'),
  ('glitter', 'Éternuer des paillettes'),
  ('shopping-cart', 'Courses'),
  ('iron', 'Repassage'),
  ('cardboard-box', 'Aider à déménager'),
  ('exam-paper', 'Contrôle surprise'),
  ('big-clock', 'Heure de colle'),
  ('prune-tart', 'Tarte aux pruneaux'),
  ('computer-mouse', 'Clicker'),
  ('gacha-capsule', 'Gacha')
) as w(concept, label)
where not exists (select 1 from public.card_icons ci where ci.concept = w.concept and ci.image is not null)
on conflict (concept) do nothing;
