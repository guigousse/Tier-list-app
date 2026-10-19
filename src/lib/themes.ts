import type { Template } from '../constants/presets';
import { splitEmoji } from './emoji';

/**
 * The grand themes the public tier lists are grouped under, shown as a gallery. Each
 * has a patchwork of cards that says what's inside (food: fruits, vegetables,
 * pastries, dishes…), drawn from the shared AI library, the emoji standing in until
 * a concept is drawn.
 */
export type Theme = {
  key: string;
  title: string;
  emoji: string;
  /** Hidden discovery tags (list_tags) that place a list without a theme of its own here. */
  tags: string[];
  /** Nine cards of the patchwork: the first, the one that says the theme best, is put forward in the middle. */
  preview: { concept: string; emoji: string }[];
};

export const THEMES: Theme[] = [
  {
    key: 'cuisine',
    title: 'Cuisine',
    emoji: '🍽️',
    tags: ['food', 'drinks', 'savory', 'sweet', 'cooking', 'fast-food', 'healthy'],
    preview: [
      { concept: 'pizza', emoji: '🍕' },
      { concept: 'strawberry', emoji: '🍓' },
      { concept: 'croissant', emoji: '🥐' },
      { concept: 'broccoli', emoji: '🥦' },
      { concept: 'cheese-wheel', emoji: '🧀' },
      { concept: 'sushi', emoji: '🍣' },
      { concept: 'ice-cream-cone', emoji: '🍦' },
      { concept: 'burger', emoji: '🍔' },
      { concept: 'bubble-tea', emoji: '🧋' },
    ],
  },
  {
    key: 'voyages',
    title: 'Voyages',
    emoji: '✈️',
    tags: ['travel', 'geography', 'transport'],
    preview: [
      { concept: 'airplane', emoji: '✈️' },
      { concept: 'eiffel-tower', emoji: '🗼' },
      { concept: 'palm-tree', emoji: '🌴' },
      { concept: 'snowy-mountain', emoji: '🏔️' },
      { concept: 'lighthouse', emoji: '🗽' },
      { concept: 'train', emoji: '🚆' },
      { concept: 'cathedral', emoji: '⛪' },
      { concept: 'suitcase', emoji: '🧳' },
      { concept: 'sand-dune', emoji: '🏜️' },
    ],
  },
  {
    key: 'jeux',
    title: 'Jeux',
    emoji: '🎮',
    tags: ['games', 'video-games', 'board-games', 'apps', 'tech', 'party'],
    preview: [
      { concept: 'gamepad', emoji: '🎮' },
      { concept: 'die', emoji: '🎲' },
      { concept: 'chess-knight', emoji: '♟️' },
      { concept: 'playing-card', emoji: '🃏' },
      { concept: 'smartphone', emoji: '📱' },
      { concept: 'jigsaw', emoji: '🧩' },
      { concept: 'arcade-cabinet', emoji: '🕹️' },
      { concept: 'trophy', emoji: '🏆' },
      { concept: 'steam-locomotive', emoji: '🚂' },
    ],
  },
  {
    key: 'culture',
    title: 'Films & musique',
    emoji: '🎬',
    tags: ['movies', 'music', 'culture', 'pop-culture'],
    preview: [
      { concept: 'film-clapperboard', emoji: '🎬' },
      { concept: 'electric-guitar', emoji: '🎸' },
      { concept: 'popcorn-bucket', emoji: '🍿' },
      { concept: 'microphone', emoji: '🎤' },
      { concept: 'violin', emoji: '🎻' },
      { concept: 'disco-ball', emoji: '🪩' },
      { concept: 'saxophone', emoji: '🎷' },
      { concept: 'headphone', emoji: '🎧' },
      { concept: 'opera-mask', emoji: '🎭' },
    ],
  },
  {
    key: 'nature',
    title: 'Animaux & nature',
    emoji: '🐾',
    tags: ['animals', 'pets', 'nature', 'outdoor'],
    preview: [
      { concept: 'panda', emoji: '🐼' },
      { concept: 'fox', emoji: '🦊' },
      { concept: 'penguin', emoji: '🐧' },
      { concept: 'sunflower', emoji: '🌻' },
      { concept: 'elephant', emoji: '🐘' },
      { concept: 'owl', emoji: '🦉' },
      { concept: 'flamingo', emoji: '🦩' },
      { concept: 'green-leaf', emoji: '🌿' },
      { concept: 'dolphin', emoji: '🐬' },
    ],
  },
  {
    key: 'fetes',
    title: 'Saisons & fêtes',
    emoji: '🎄',
    tags: ['seasons', 'holidays', 'christmas', 'halloween', 'winter'],
    preview: [
      { concept: 'christma-tree', emoji: '🎄' },
      { concept: 'jack-o-lantern', emoji: '🎃' },
      { concept: 'snowflake', emoji: '❄️' },
      { concept: 'sun', emoji: '☀️' },
      { concept: 'birthday-cake', emoji: '🎂' },
      { concept: 'autumn-leaf', emoji: '🍂' },
      { concept: 'firework', emoji: '🎆' },
      { concept: 'easter-egg', emoji: '🥚' },
      { concept: 'heart', emoji: '💘' },
    ],
  },
  {
    key: 'loisirs',
    title: 'Sport & loisirs',
    emoji: '⚽',
    tags: ['sports', 'leisure', 'daily-life', 'lifestyle', 'school', 'work', 'kids', 'comfort'],
    preview: [
      { concept: 'soccer-ball', emoji: '⚽' },
      { concept: 'tennis-racket', emoji: '🎾' },
      { concept: 'basketball', emoji: '🏀' },
      { concept: 'book', emoji: '📚' },
      { concept: 'bed', emoji: '😴' },
      { concept: 'hiking-boot', emoji: '🥾' },
      { concept: 'bicycle', emoji: '🚲' },
      { concept: 'ping-pong-paddle', emoji: '🏓' },
      { concept: 'surfboard', emoji: '🏄' },
    ],
  },
  {
    key: 'imaginaire',
    title: 'Imaginaire',
    emoji: '🦸',
    tags: ['fantasy', 'imagination'],
    preview: [
      { concept: 'dragon', emoji: '🐉' },
      { concept: 'superhero-cape', emoji: '🦸' },
      { concept: 'unicorn', emoji: '🦄' },
      { concept: 'magic-wand', emoji: '🪄' },
      { concept: 'rocket', emoji: '🚀' },
      { concept: 'ghost', emoji: '👻' },
      { concept: 'crystal-ball', emoji: '🔮' },
      { concept: 'royal-cape', emoji: '👑' },
      { concept: 'lightning-bolt', emoji: '⚡' },
    ],
  },
];

/** Where a list goes when nothing places it: everyday life is the widest. */
const FALLBACK = 'loisirs';

const byKey = new Map(THEMES.map((t) => [t.key, t]));
export const themeOf = (key: string): Theme | undefined => byKey.get(key);

/**
 * Theme of a list: its own, else the one its discovery tags point to. Tags come most
 * specific first ("food, savory, fast-food"), so the first ones weigh more: a list
 * tagged "food, daily-life" is food, not everyday life.
 */
export function listTheme(template: Template, tags: string[] = []): string {
  if (template.theme && byKey.has(template.theme)) return template.theme;
  let best = FALLBACK;
  let bestScore = 0;
  for (const theme of THEMES) {
    const score = tags.reduce((sum, tag, i) => sum + (theme.tags.includes(tag) ? 1 / (i + 1) : 0), 0);
    if (score > bestScore) [best, bestScore] = [theme.key, score];
  }
  return best;
}

/** The public lists of each theme, in the order given; themes with no list are left out. */
export function groupByTheme(templates: Template[], tags: Record<string, string[]>): { theme: Theme; templates: Template[] }[] {
  const groups = new Map<string, Template[]>(THEMES.map((t) => [t.key, []]));
  for (const t of templates) groups.get(listTheme(t, tags[t.key]))!.push(t);
  return THEMES.flatMap((theme) => {
    const lists = groups.get(theme.key)!;
    return lists.length ? [{ theme, templates: lists }] : [];
  });
}

/**
 * The cards of a theme's circle: the one put forward first, then its patchwork and the
 * cards of its lists, those already drawn in the library before those still waiting for
 * their picture (shown as an emoji), each concept once, `count` at most.
 */
export function themeStickers(theme: Theme, templates: Template[], icons: Record<string, string>, count: number): { concept: string; emoji: string }[] {
  const [hero, ...patchwork] = theme.preview;
  const seen = new Set([hero.concept]);
  const cards: { concept: string; emoji: string }[] = [];
  const add = (concept: string, emoji: string) => {
    if (!concept || seen.has(concept)) return;
    seen.add(concept);
    cards.push({ concept, emoji });
  };
  for (const p of patchwork) add(p.concept, p.emoji);
  for (const t of templates) (t.concepts ?? []).forEach((concept, i) => add(concept, splitEmoji(t.items[i] ?? '').emoji || t.emoji));
  // Drawn first, in their order: a circle full of pictures rather than of emoji.
  const drawn = cards.filter((c) => icons[c.concept]);
  const waiting = cards.filter((c) => !icons[c.concept]);
  return [hero, ...drawn, ...waiting].slice(0, count);
}
