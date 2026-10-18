-- The statistics, second pass, after reading the first figures on the project:
-- * the cards of the lists built into the app had no name ("#4"): their names live in the
--   app (src/constants/presets.ts), copied here. Cards are only ever added at the end of a
--   public list, so an index keeps its card; run again with the new names when a built-in
--   list grows (scripts: dump TEMPLATES, regenerate the values below);
-- * a list's "completion" (votes / views) went past 100 %: opening is not recorded for
--   every list, so the ratio meant nothing; dropped. The daily lists, which have their own
--   view, leave the lists' one;
-- * TestFlight purchases (Sandbox) no longer count as revenue.

create table if not exists stats.builtin_cards (key text primary key, items text[] not null);
revoke all on stats.builtin_cards from public, anon, authenticated;
insert into stats.builtin_cards (key, items) values
  ('mobile-games', array['Broc : jeu de brocante cosy', 'Clash Royale', 'Clash of Clans', 'Brawl Stars', 'Candy Crush Saga', 'Subway Surfers', 'Pokémon GO', 'Among Us!', 'Roblox', 'Minecraft', 'Geometry Dash', 'Monument Valley', 'Plants vs. Zombies 2', 'Hay Day', 'Fruit Ninja']),
  ('fruits', array['🍎 Pomme', '🍌 Banane', '🍓 Fraise', '🍇 Raisin', '🍉 Pastèque', '🍍 Ananas', '🥭 Mangue', '🍒 Cerise', '🍑 Pêche', '🥝 Kiwi', '🍋 Citron', '🍐 Poire', '🍊 Orange', '🫐 Myrtille', '🍈 Melon', '🥥 Noix de coco', '🍓 Framboise', '🍑 Abricot', '🟣 Figue', '🐉 Fruit du dragon', '🟢 Durian', '🍋 Coing', '🍊 Pamplemousse', '🔴 Groseille']),
  ('desserts', array['🍰 Fraisier', '🍫 Fondant', '🍮 Crème brûlée', '🥧 Tarte', '🍩 Donut', '🧁 Cupcake', '🍦 Glace', '🥞 Crêpes', '🍪 Cookie', '🍨 Tiramisu', '🍫 Mousse au chocolat', '🍮 Flan', '🍰 Cheesecake', '🍎 Tarte Tatin', '🍚 Riz au lait', '🧇 Gaufre', '🍌 Banana split', '🥮 Brownie', '🍓 Pavlova', '🍮 Île flottante', '🥣 Gâteau de semoule', '🍮 Pudding', '🍹 Baba au rhum', '🍑 Fruits au sirop']),
  ('animals', array['🐶 Chien', '🐱 Chat', '🐼 Panda', '🦁 Lion', '🐧 Pingouin', '🦊 Renard', '🐨 Koala', '🐬 Dauphin', '🦉 Hibou', '🐢 Tortue', '🐘 Éléphant', '🦄 Licorne', '🐰 Lapin', '🐯 Tigre', '🦒 Girafe', '🦩 Flamant rose', '🐙 Pieuvre', '🦦 Loutre', '🐻 Ours', '🦥 Paresseux', '🕷️ Araignée', '🪳 Cafard', '🦟 Moustique', '🐀 Rat', '🪼 Méduse']),
  ('sports', array['⚽ Football', '🏀 Basket', '🎾 Tennis', '🏉 Rugby', '🏐 Volley', '🏊 Natation', '🚴 Vélo', '🥊 Boxe', '⛷️ Ski', '🏓 Ping-pong', '🏃 Course', '🧗 Escalade', '🏸 Badminton', '🏄 Surf', '🥋 Judo', '⛳ Golf', '🛹 Skateboard', '🤾 Handball', '🏇 Équitation', '🤺 Escrime']),
  ('seasons', array['🌸 Printemps', '☀️ Été', '🍂 Automne', '❄️ Hiver', '🎄 Noël', '🎃 Halloween', '🎆 Nouvel an', '🐣 Pâques', '🎂 Anniversaire', '💘 Saint-Valentin', '🎭 Carnaval', '🎵 Fête de la musique', '🇫🇷 14 Juillet', '👑 Épiphanie', '🥞 Chandeleur', '🏖️ Grandes vacances', '🎒 Rentrée', '💐 Fête des mères', '👔 Fête des pères', '🐟 Poisson d’avril', '⏰ Changement d’heure', '🧾 Déclaration d’impôts']),
  ('food', array['🍕 Pizza', '🍔 Burger', '🍣 Sushi', '🌮 Tacos', '🍝 Pâtes', '🥗 Salade', '🍜 Ramen', '🥘 Paella', '🧀 Raclette', '🥐 Croissant', '🌯 Kebab', '🍛 Curry', '🫕 Fondue', '🥧 Quiche', '🍲 Pot-au-feu', '🥟 Raviolis chinois', '🍗 Poulet rôti', '🥩 Steak frites', '🥞 Galette', '🍆 Ratatouille', '🌭 Andouillette', '🍲 Tripes', '🐮 Tête de veau', '🥫 Raviolis en boîte']),
  ('vegetables', array['🥦 Brocoli', '🥕 Carotte', '🍅 Tomate', '🥒 Concombre', '🌽 Maïs', '🥔 Pomme de terre', '🍆 Aubergine', '🫑 Poivron', '🧅 Oignon', '🥬 Salade', '🍄 Champignon', '🫛 Petits pois', '🥒 Courgette', '🎃 Potiron', '🥬 Épinards', '🫘 Haricots verts', '🥬 Chou de Bruxelles', '🌿 Poireau', '🟣 Betterave', '🌿 Artichaut', '⚪ Navet', '🥬 Endive cuite', '🌿 Céleri']),
  ('drinks', array['☕ Café', '🍵 Thé', '🧋 Bubble tea', '🥤 Soda', '🧃 Jus de fruits', '🥛 Lait', '🍫 Chocolat chaud', '💧 Eau', '🍋 Limonade', '🥥 Eau de coco', '🧉 Maté', '🍹 Smoothie', '🍊 Jus d’orange', '🧊 Thé glacé', '🥤 Milkshake', '☕ Cappuccino', '🌿 Tisane', '🫧 Eau pétillante', '🍎 Jus de pomme', '🍵 Matcha', '🍅 Jus de tomate', '☕ Café soluble', '🫙 Kombucha']),
  ('cheeses', array['🧀 Comté', '🧀 Camembert', '🧀 Brie', '🧀 Roquefort', '🧀 Reblochon', '🧀 Chèvre', '🧀 Emmental', '🧀 Mozzarella', '🧀 Cantal', '🧀 Munster', '🧀 Beaufort', '🧀 Parmesan', '🧀 Feta', '🧀 Raclette', '🧀 Saint-Nectaire', '🧀 Mimolette', '🧀 Mont d’Or', '🧀 Gouda', '🧀 Bleu d’Auvergne', '🧀 Burrata', '🧀 Cheddar en tranche', '🧀 Râpé en sachet']),
  ('breakfast', array['🥐 Croissant', '🍫 Pain au chocolat', '🥖 Tartine beurre', '🍯 Miel', '🥞 Pancakes', '🧇 Gaufre', '🥣 Céréales', '🍳 Œufs', '🥓 Bacon', '🥑 Avocado toast', '🥯 Bagel', '🍓 Confiture', '🍫 Pâte à tartiner', '🥛 Yaourt', '🥣 Porridge', '🍞 Brioche', '🍳 Pain perdu', '🥗 Salade de fruits', '🥐 Pain aux raisins', '🧀 Croque-monsieur', '🍞 Biscottes', '🥖 Pain rassis']),
  ('destinations', array['🇫🇷 France', '🇮🇹 Italie', '🇪🇸 Espagne', '🇵🇹 Portugal', '🇬🇷 Grèce', '🇯🇵 Japon', '🇺🇸 États-Unis', '🇨🇦 Canada', '🇲🇦 Maroc', '🇹🇭 Thaïlande', '🇧🇷 Brésil', '🇮🇸 Islande', '🇬🇧 Royaume-Uni', '🇲🇽 Mexique', '🇪🇬 Égypte', '🇦🇺 Australie', '🇳🇴 Norvège', '🇮🇳 Inde', '🇨🇭 Suisse', '🇳🇿 Nouvelle-Zélande']),
  ('boardgames', array['♟️ Échecs', '🎲 Monopoly', '🃏 Uno', '🔤 Scrabble', '🕵️ Cluedo', '🎴 Dames', '🧩 Puzzle', '🏝️ Catan', '🚂 Les Aventuriers du Rail', '🐺 Loup-garou', '🎯 Trivial Pursuit', '🀄 Mahjong', '🎲 Yams', '🃏 Tarot', '🐴 Petits chevaux', '🧱 Jenga', '🔴 Puissance 4', '⛵ Bataille navale', '🕵️ Codenames', '🦓 Dixit', '🪿 Jeu de l’oie', '🃏 Bataille', '🎱 Loto']),
  ('movie-genres', array['💥 Action', '😂 Comédie', '😱 Horreur', '💘 Romance', '🚀 Science-fiction', '🧙 Fantastique', '🕵️ Policier', '🎭 Drame', '🎨 Animation', '📽️ Documentaire', '🤠 Western', '🎤 Comédie musicale', '🦸 Super-héros', '🔪 Thriller', '🏴‍☠️ Aventure', '🪖 Guerre', '📜 Historique', '🧸 Film pour enfants', '🧟 Zombies', '🕰️ Film en noir et blanc', '📺 Téléfilm de Noël', '🦈 Nanar']),
  ('music-genres', array['🎸 Rock', '🎤 Rap', '🎹 Classique', '🎷 Jazz', '💃 Pop', '🪩 Électro', '🤠 Country', '🎺 Funk', '🥁 Metal', '🌴 Reggae', '🎻 Folk', '💿 R&B', '🪩 Disco', '🇫🇷 Chanson française', '🎤 K-pop', '🎸 Punk', '🎙️ Soul', '🎶 Blues', '💃 Salsa', '🎧 Lo-fi', '🛗 Musique d’ascenseur', '📢 Jingle de pub']),
  ('instruments', array['🎸 Guitare', '🎹 Piano', '🥁 Batterie', '🎻 Violon', '🎺 Trompette', '🎷 Saxophone', '🪕 Banjo', '🪈 Flûte', '🪗 Accordéon', '🎤 Chant', '🪘 Djembé', '🎼 Harpe', '🎻 Violoncelle', '🎸 Basse', '🎶 Harmonica', '🎹 Synthétiseur', '🎺 Trombone', '🎵 Ukulélé', '🔔 Xylophone', '🎶 Cornemuse', '🪈 Flûte à bec', '📯 Vuvuzela', '🔺 Triangle', '🎶 Kazoo']),
  ('transport', array['🚗 Voiture', '🚲 Vélo', '🛴 Trottinette', '🚆 Train', '🚇 Métro', '🚌 Bus', '✈️ Avion', '🚢 Bateau', '🏍️ Moto', '🚕 Taxi', '🚡 Téléphérique', '🚶 À pied', '🚊 Tramway', '🛵 Scooter', '🚁 Hélicoptère', '🛶 Kayak', '🎈 Montgolfière', '🚐 Van aménagé', '⛵ Voilier', '🛼 Rollers', '🛞 Monocycle', '🫏 Âne', '🌙 Car de nuit']),
  ('superpowers', array['🕊️ Voler', '👻 Invisibilité', '⏳ Voyager dans le temps', '🌀 Téléportation', '🧠 Lire les pensées', '💪 Super-force', '⚡ Super-vitesse', '🔥 Contrôler le feu', '❄️ Contrôler la glace', '🗣️ Parler aux animaux', '♾️ Immortalité', '🩹 Guérison', '🫧 Respirer sous l’eau', '🔮 Voir l’avenir', '🧲 Contrôler le métal', '🦎 Changer d’apparence', '🕸️ Marcher sur les murs', '🌱 Faire pousser les plantes', '🌤️ Contrôler la météo', '🗝️ Traverser les murs', '🐦 Parler aux pigeons', '✨ Briller dans le noir', '🤏 Rétrécir sans retour', '👂 Tout entendre sans arrêt', '🤧 Éternuer des paillettes']),
  ('weekend', array['🛋️ Canapé & séries', '🥾 Randonnée', '🎬 Cinéma', '🍽️ Restaurant', '🛍️ Shopping', '🏖️ Plage', '🎮 Jeux vidéo', '📚 Lecture', '🎉 Soirée entre amis', '🧘 Yoga', '🏟️ Match', '😴 Grasse matinée', '🥐 Brunch', '🖼️ Musée', '🎤 Karaoké', '🧹 Ménage', '🌳 Pique-nique', '🍳 Cuisiner', '🏰 Brocante', '🎲 Jeux de société', '🛒 Courses', '🧺 Repassage', '📦 Aider à déménager']),
  ('school', array['➗ Maths', '📖 Français', '🌍 Géographie', '🏛️ Histoire', '🇬🇧 Anglais', '🔬 SVT', '⚗️ Physique-chimie', '🎨 Arts plastiques', '🎵 Musique', '⚽ Sport', '💻 Informatique', '🤔 Philosophie', '🇪🇸 Espagnol', '🇩🇪 Allemand', '🏛️ Latin', '📈 Économie', '⚖️ Éducation civique', '🛠️ Technologie', '🍽️ Cantine', '🔔 Récréation', '📝 Contrôle surprise', '⏳ Heure de colle'])
on conflict (key) do update set items = excluded.items;

create or replace view stats.cards as
  with r as (
    select split_part(lv.list_key, ':', 2) as k, (u.i - 1)::int as idx, u.r::numeric as rank
    from public.list_votes lv, unnest(lv.ranks) with ordinality as u(r, i)
    where lv.list_key like 'popular:%' and u.r >= 0
    union all
    select 'daily-' || dv.day, (u.i - 1)::int, u.r::numeric
    from public.daily_votes dv, unnest(dv.ranks) with ordinality as u(r, i)
    where u.r >= 0
  )
  select r.k as list_key, r.idx,
    coalesce(t.items[r.idx + 1], b.items[r.idx + 1], dl.items[r.idx + 1], '#' || r.idx) as card,
    count(*) as votes, round(avg(rank), 2) as mean_rank, round(stddev_samp(rank), 2) as spread
  from r
  left join public.templates t on t.key = r.k
  left join stats.builtin_cards b on b.key = r.k
  left join public.daily_lists dl on 'daily-' || dl.day = r.k
  group by r.k, r.idx, t.items, b.items, dl.items
  having count(*) >= 3;

-- Renamed rather than dropped: the database tool asks for a confirmation it can't get on
-- a DROP. stats.lists_v1 is unused; drop it from the SQL editor at leisure.
alter view stats.lists rename to lists_v1;
create view stats.lists as
  with votes as (select split_part(list_key, ':', 2) as k, count(*) as votes from public.list_votes where list_key like 'popular:%' group by 1),
  views as (select template_key as k, count(*) as views from public.template_views group by 1),
  favs as (select template_key as k, count(*) filter (where active) as favorites from public.template_favorites group by 1)
  select coalesce(v.k, w.k, f.k) as list_key,
    coalesce(t.title, bt.title, coalesce(v.k, w.k, f.k)) as title,
    coalesce(v.votes, 0) as votes, coalesce(w.views, 0) as views, coalesce(f.favorites, 0) as favorites
  from votes v full join views w on w.k = v.k full join favs f on f.k = coalesce(v.k, w.k)
  left join public.templates t on t.key = coalesce(v.k, w.k, f.k)
  left join private.builtin_titles bt on bt.key = coalesce(v.k, w.k, f.k)
  where coalesce(v.k, w.k, f.k) not like 'daily-%'
  order by votes desc, views desc;

create or replace view stats.purchases as
  select p.product_id, p.environment, count(*) as purchases, count(*) filter (where p.refunded_at is not null) as refunded,
    count(distinct p.wallet_id) as buyers, sum(p.credits) as credits,
    case when p.environment = 'Production' then coalesce(sum(price.eur) filter (where p.refunded_at is null), 0) end as revenue_eur
  from public.credit_purchases p
  left join (values ('tiercraft.energy.60', 0.99), ('tiercraft.energy.200', 2.99), ('tiercraft.energy.360', 4.99),
    ('tiercraft.energy.800', 9.99), ('tiercraft.energy.1750', 19.99)) as price(product, eur) on price.product = p.product_id
  group by p.product_id, p.environment order by p.environment, revenue_eur desc nulls last;

revoke all on all tables in schema stats from public, anon, authenticated;
