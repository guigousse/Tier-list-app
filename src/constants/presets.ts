import { TIER_COLORS } from './theme';

export type TierPreset = {
  key: string;
  name: string;
  labels: string[];
};

export const TIER_PRESETS: TierPreset[] = [
  { key: 'classic', name: 'Classique', labels: ['S', 'A', 'B', 'C', 'D'] },
  { key: 'extended', name: 'Étendu', labels: ['S', 'A', 'B', 'C', 'D', 'E', 'F'] },
  { key: 'top3', name: 'Podium', labels: ['Or', 'Argent', 'Bronze'] },
  { key: 'love', name: 'Avis', labels: ['Adoré', 'Aimé', 'Bof', 'Détesté'] },
  { key: 'numbers', name: 'Notes', labels: ['10', '8', '6', '4', '2'] },
];

export const DEFAULT_PRESET_KEY = 'classic';

export function tierColorAt(index: number): string {
  return TIER_COLORS[index % TIER_COLORS.length];
}

export type Template = {
  key: string;
  title: string;
  emoji: string;
  items: string[];
  /** Tier labels to start with instead of the user's default preset. */
  tiers?: string[];
};

/** Ready-to-rank card sets, shown in the "Modèles" screen. */
export const TEMPLATES: Template[] = [
  {
    key: 'fruits',
    title: 'Fruits',
    emoji: '🍓',
    items: ['🍎 Pomme', '🍌 Banane', '🍓 Fraise', '🍇 Raisin', '🍉 Pastèque', '🍍 Ananas', '🥭 Mangue', '🍒 Cerise', '🍑 Pêche', '🥝 Kiwi', '🍋 Citron', '🍐 Poire'],
  },
  {
    key: 'desserts',
    title: 'Desserts',
    emoji: '🍰',
    items: ['🍰 Fraisier', '🍫 Fondant', '🍮 Crème brûlée', '🥧 Tarte', '🍩 Donut', '🧁 Cupcake', '🍦 Glace', '🥞 Crêpes', '🍪 Cookie', '🍨 Tiramisu'],
  },
  {
    key: 'animals',
    title: 'Animaux',
    emoji: '🐼',
    items: ['🐶 Chien', '🐱 Chat', '🐼 Panda', '🦁 Lion', '🐧 Pingouin', '🦊 Renard', '🐨 Koala', '🐬 Dauphin', '🦉 Hibou', '🐢 Tortue', '🐘 Éléphant', '🦄 Licorne'],
  },
  {
    key: 'sports',
    title: 'Sports',
    emoji: '⚽',
    items: ['⚽ Football', '🏀 Basket', '🎾 Tennis', '🏉 Rugby', '🏐 Volley', '🏊 Natation', '🚴 Vélo', '🥊 Boxe', '⛷️ Ski', '🏓 Ping-pong', '🏃 Course', '🧗 Escalade'],
  },
  {
    key: 'seasons',
    title: 'Saisons & fêtes',
    emoji: '🎄',
    items: ['🌸 Printemps', '☀️ Été', '🍂 Automne', '❄️ Hiver', '🎄 Noël', '🎃 Halloween', '🎆 Nouvel an', '🐣 Pâques', '🎂 Anniversaire', '💘 Saint-Valentin'],
  },
  {
    key: 'food',
    title: 'Plats',
    emoji: '🍕',
    items: ['🍕 Pizza', '🍔 Burger', '🍣 Sushi', '🌮 Tacos', '🍝 Pâtes', '🥗 Salade', '🍜 Ramen', '🥘 Paella', '🧀 Raclette', '🥐 Croissant', '🌯 Kebab', '🍛 Curry'],
  },
  {
    key: 'vegetables',
    title: 'Légumes',
    emoji: '🥦',
    items: ['🥦 Brocoli', '🥕 Carotte', '🍅 Tomate', '🥒 Concombre', '🌽 Maïs', '🥔 Pomme de terre', '🍆 Aubergine', '🫑 Poivron', '🧅 Oignon', '🥬 Salade', '🍄 Champignon', '🫛 Petits pois'],
  },
  {
    key: 'drinks',
    title: 'Boissons',
    emoji: '🧋',
    items: ['☕ Café', '🍵 Thé', '🧋 Bubble tea', '🥤 Soda', '🧃 Jus de fruits', '🥛 Lait', '🍫 Chocolat chaud', '💧 Eau', '🍋 Limonade', '🥥 Eau de coco', '🧉 Maté', '🍹 Smoothie'],
  },
  {
    key: 'cheeses',
    title: 'Fromages',
    emoji: '🧀',
    items: ['🧀 Comté', '🧀 Camembert', '🧀 Brie', '🧀 Roquefort', '🧀 Reblochon', '🧀 Chèvre', '🧀 Emmental', '🧀 Mozzarella', '🧀 Cantal', '🧀 Munster', '🧀 Beaufort', '🧀 Parmesan'],
  },
  {
    key: 'breakfast',
    title: 'Petit-déjeuner',
    emoji: '🥐',
    items: ['🥐 Croissant', '🍫 Pain au chocolat', '🥖 Tartine beurre', '🍯 Miel', '🥞 Pancakes', '🧇 Gaufre', '🥣 Céréales', '🍳 Œufs', '🥓 Bacon', '🥑 Avocado toast', '🥯 Bagel', '🍓 Confiture'],
  },
  {
    key: 'destinations',
    title: 'Destinations',
    emoji: '✈️',
    items: ['🇫🇷 France', '🇮🇹 Italie', '🇪🇸 Espagne', '🇵🇹 Portugal', '🇬🇷 Grèce', '🇯🇵 Japon', '🇺🇸 États-Unis', '🇨🇦 Canada', '🇲🇦 Maroc', '🇹🇭 Thaïlande', '🇧🇷 Brésil', '🇮🇸 Islande'],
  },
  {
    key: 'boardgames',
    title: 'Jeux de société',
    emoji: '🎲',
    items: ['♟️ Échecs', '🎲 Monopoly', '🃏 Uno', '🔤 Scrabble', '🕵️ Cluedo', '🎴 Dames', '🧩 Puzzle', '🏝️ Catan', '🚂 Les Aventuriers du Rail', '🐺 Loup-garou', '🎯 Trivial Pursuit', '🀄 Mahjong'],
  },
  {
    key: 'movie-genres',
    title: 'Genres de films',
    emoji: '🎬',
    items: ['💥 Action', '😂 Comédie', '😱 Horreur', '💘 Romance', '🚀 Science-fiction', '🧙 Fantastique', '🕵️ Policier', '🎭 Drame', '🎨 Animation', '📽️ Documentaire', '🤠 Western', '🎤 Comédie musicale'],
  },
  {
    key: 'music-genres',
    title: 'Styles de musique',
    emoji: '🎧',
    items: ['🎸 Rock', '🎤 Rap', '🎹 Classique', '🎷 Jazz', '💃 Pop', '🪩 Électro', '🤠 Country', '🎺 Funk', '🥁 Metal', '🌴 Reggae', '🎻 Folk', '💿 R&B'],
  },
  {
    key: 'instruments',
    title: 'Instruments',
    emoji: '🎸',
    items: ['🎸 Guitare', '🎹 Piano', '🥁 Batterie', '🎻 Violon', '🎺 Trompette', '🎷 Saxophone', '🪕 Banjo', '🪈 Flûte', '🪗 Accordéon', '🎤 Chant', '🪘 Djembé', '🎼 Harpe'],
  },
  {
    key: 'transport',
    title: 'Transports',
    emoji: '🚗',
    items: ['🚗 Voiture', '🚲 Vélo', '🛴 Trottinette', '🚆 Train', '🚇 Métro', '🚌 Bus', '✈️ Avion', '🚢 Bateau', '🏍️ Moto', '🚕 Taxi', '🚡 Téléphérique', '🚶 À pied'],
  },
  {
    key: 'superpowers',
    title: 'Super-pouvoirs',
    emoji: '🦸',
    items: ['🕊️ Voler', '👻 Invisibilité', '⏳ Voyager dans le temps', '🌀 Téléportation', '🧠 Lire les pensées', '💪 Super-force', '⚡ Super-vitesse', '🔥 Contrôler le feu', '❄️ Contrôler la glace', '🗣️ Parler aux animaux', '♾️ Immortalité', '🩹 Guérison'],
  },
  {
    key: 'weekend',
    title: 'Activités du week-end',
    emoji: '🛋️',
    items: ['🛋️ Canapé & séries', '🥾 Randonnée', '🎬 Cinéma', '🍽️ Restaurant', '🛍️ Shopping', '🏖️ Plage', '🎮 Jeux vidéo', '📚 Lecture', '🎉 Soirée entre amis', '🧘 Yoga', '🏟️ Match', '😴 Grasse matinée'],
  },
  {
    key: 'school',
    title: 'Matières scolaires',
    emoji: '📚',
    items: ['➗ Maths', '📖 Français', '🌍 Géographie', '🏛️ Histoire', '🇬🇧 Anglais', '🔬 SVT', '⚗️ Physique-chimie', '🎨 Arts plastiques', '🎵 Musique', '⚽ Sport', '💻 Informatique', '🤔 Philosophie'],
  },
];
