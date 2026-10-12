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
];
