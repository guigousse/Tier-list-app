/**
 * Player avatars drawn in SVG, from a few choices: face shape and skin, hair
 * (style and colour), eyes (shape, colour, eyebrows), mouth, facial hair, hat,
 * glasses and background. Stored as a short code on the profile
 * ("a2-oval-p2-long-blond-lashes-blue-thin-smile-none-none-round-violet"), so new
 * items can be added later without breaking saved avatars: unknown ids fall back
 * to the defaults.
 *
 * Some items are locked at first and unlocked by playing (daily streak, number of
 * tier lists completed).
 */

export type Unlock = { streak: number } | { completed: number };

type Item = { id: string; label: string; unlock?: Unlock };

export type Skin = Item & { fill: string; shade: string };
export type HairColor = Item & { fill: string };
export type EyeColor = Item & { fill: string };
export type Background = Item & { stops: string[]; shirt: string; stars?: boolean };

export const FACES: Item[] = [
  { id: 'oval', label: 'Ovale' },
  { id: 'round', label: 'Rond' },
  { id: 'square', label: 'Carré' },
  { id: 'heart', label: 'Cœur' },
  { id: 'long', label: 'Allongé' },
];

export const SKINS: Skin[] = [
  { id: 'p1', label: 'Très clair', fill: '#FBE3D3', shade: '#EDC3AC' },
  { id: 'p2', label: 'Clair', fill: '#F3CBA9', shade: '#DFA680' },
  { id: 'p3', label: 'Médium', fill: '#DEA676', shade: '#C38655' },
  { id: 'p4', label: 'Mat', fill: '#BC8052', shade: '#9E6338' },
  { id: 'p5', label: 'Foncé', fill: '#8D5835', shade: '#704225' },
  { id: 'p6', label: 'Très foncé', fill: '#5E3B25', shade: '#472B1A' },
  { id: 'emoji', label: 'Emoji', fill: '#FFCC4D', shade: '#EDA634' },
  { id: 'alien', label: 'Alien', fill: '#9FE07F', shade: '#77BF5B', unlock: { streak: 14 } },
  { id: 'smurf', label: 'Bleu', fill: '#8DBBFF', shade: '#6A98E6', unlock: { completed: 25 } },
  { id: 'robot', label: 'Robot', fill: '#C3CCDA', shade: '#98A3B5', unlock: { completed: 50 } },
];

export const HAIR_STYLES: Item[] = [
  { id: 'short', label: 'Court' },
  { id: 'quiff', label: 'Mèche' },
  { id: 'curly', label: 'Bouclé' },
  { id: 'buzz', label: 'Rasé' },
  { id: 'bald', label: 'Chauve' },
  { id: 'long', label: 'Long' },
  { id: 'bob', label: 'Carré' },
  { id: 'bun', label: 'Chignon' },
  { id: 'afro', label: 'Afro' },
  { id: 'pony', label: 'Queue', unlock: { completed: 5 } },
  { id: 'mohawk', label: 'Crête', unlock: { streak: 7 } },
];

export const HAIR_COLORS: HairColor[] = [
  { id: 'black', label: 'Noir', fill: '#24201F' },
  { id: 'brown', label: 'Brun', fill: '#4E3122' },
  { id: 'chestnut', label: 'Châtain', fill: '#80502D' },
  { id: 'blond', label: 'Blond', fill: '#E3B860' },
  { id: 'red', label: 'Roux', fill: '#C4552C' },
  { id: 'grey', label: 'Gris', fill: '#BDB7B0' },
  { id: 'pink', label: 'Rose', fill: '#FF86B6', unlock: { streak: 7 } },
  { id: 'blue', label: 'Bleu', fill: '#4C8DFF', unlock: { completed: 10 } },
  { id: 'purple', label: 'Violet', fill: '#9466FF', unlock: { streak: 30 } },
  { id: 'green', label: 'Vert', fill: '#3FBF7F', unlock: { completed: 3 } },
  { id: 'flame', label: 'Flamme', fill: '#FF6A2B', unlock: { streak: 3 } },
];

export const EYE_SHAPES: Item[] = [
  { id: 'round', label: 'Ronds' },
  { id: 'lashes', label: 'Cils' },
  { id: 'almond', label: 'En amande' },
  { id: 'sleepy', label: 'Paupières' },
  { id: 'happy', label: 'Rieurs' },
  { id: 'wink', label: 'Clin d’œil', unlock: { completed: 10 } },
];

export const EYE_COLORS: EyeColor[] = [
  { id: 'brown', label: 'Marron', fill: '#6B3F21' },
  { id: 'hazel', label: 'Noisette', fill: '#977233' },
  { id: 'green', label: 'Vert', fill: '#3F915B' },
  { id: 'blue', label: 'Bleu', fill: '#3B80DB' },
  { id: 'grey', label: 'Gris', fill: '#7D8B97' },
  { id: 'violet', label: 'Violet', fill: '#8B5CF6', unlock: { streak: 14 } },
  { id: 'gold', label: 'Or', fill: '#E0A21B', unlock: { completed: 25 } },
  { id: 'ruby', label: 'Rubis', fill: '#E0303A', unlock: { streak: 21 } },
];

export const BROWS: Item[] = [
  { id: 'thick', label: 'Épais' },
  { id: 'thin', label: 'Fins' },
  { id: 'arched', label: 'Arqués' },
  { id: 'flat', label: 'Droits' },
  { id: 'bushy', label: 'Broussailleux' },
  { id: 'raised', label: 'Sceptique', unlock: { streak: 7 } },
];

export const MOUTHS: Item[] = [
  { id: 'smile', label: 'Sourire' },
  { id: 'closed', label: 'Doux' },
  { id: 'grin', label: 'Éclat de rire' },
  { id: 'smirk', label: 'En coin' },
  { id: 'lips', label: 'Lèvres' },
  { id: 'o', label: 'Surpris' },
  { id: 'tongue', label: 'Langue', unlock: { streak: 14 } },
];

export const BEARDS: Item[] = [
  { id: 'none', label: 'Aucune' },
  { id: 'stubble', label: 'Barbe de 3 jours' },
  { id: 'mustache', label: 'Moustache' },
  { id: 'goatee', label: 'Bouc' },
  { id: 'short', label: 'Barbe courte' },
  { id: 'full', label: 'Barbe fournie' },
  { id: 'handlebar', label: 'Guidon', unlock: { completed: 10 } },
];

export const HATS: Item[] = [
  { id: 'none', label: 'Aucun' },
  { id: 'cap', label: 'Casquette' },
  { id: 'beanie', label: 'Bonnet' },
  { id: 'crown', label: 'Couronne', unlock: { streak: 7 } },
  { id: 'headphones', label: 'Casque', unlock: { completed: 10 } },
  { id: 'wizard', label: 'Sorcier', unlock: { streak: 30 } },
  { id: 'party', label: 'Chapeau de fête', unlock: { completed: 1 } },
  { id: 'tophat', label: 'Haut-de-forme', unlock: { completed: 40 } },
  { id: 'halo', label: 'Auréole', unlock: { completed: 75 } },
  { id: 'horns', label: 'Cornes', unlock: { streak: 50 } },
];

export const GLASSES: Item[] = [
  { id: 'none', label: 'Aucunes' },
  { id: 'round', label: 'Rondes' },
  { id: 'square', label: 'Carrées' },
  { id: 'sun', label: 'Soleil', unlock: { completed: 5 } },
  { id: 'heart', label: 'Cœur', unlock: { streak: 14 } },
  { id: 'star', label: 'Étoiles', unlock: { completed: 15 } },
];

export const BACKGROUNDS: Background[] = [
  { id: 'violet', label: 'Violet', stops: ['#A898FF', '#6A4DF0'], shirt: '#FFD166' },
  { id: 'coral', label: 'Corail', stops: ['#FFAA98', '#FF5F6D'], shirt: '#2D3047' },
  { id: 'mint', label: 'Menthe', stops: ['#8EEBD0', '#27B48F'], shirt: '#FFFFFF' },
  { id: 'sky', label: 'Ciel', stops: ['#9CD8FF', '#4A8FE2'], shirt: '#FF8A5B' },
  { id: 'sun', label: 'Soleil', stops: ['#FFE6A3', '#FFAE45'], shirt: '#5B3FE0' },
  { id: 'night', label: 'Nuit', stops: ['#3E4566', '#191D2B'], shirt: '#7C5CFF' },
  { id: 'rainbow', label: 'Arc-en-ciel', stops: ['#FF7F7F', '#FFD36E', '#7FE3A0', '#7FB8FF', '#B98BFF'], shirt: '#FFFFFF', unlock: { streak: 7 } },
  { id: 'gold', label: 'Or', stops: ['#FFE9A6', '#E2A72E'], shirt: '#2D3047', unlock: { completed: 25 } },
  { id: 'galaxy', label: 'Galaxie', stops: ['#4B2C8F', '#0F0B26'], shirt: '#FF86B6', stars: true, unlock: { streak: 30 } },
  { id: 'ember', label: 'Braise', stops: ['#FFB36B', '#E2462B'], shirt: '#2D3047', unlock: { streak: 1 } },
  { id: 'inferno', label: 'Volcan', stops: ['#FFD36E', '#FF5A1F', '#4A0D0D'], shirt: '#FFD36E', stars: true, unlock: { streak: 100 } },
  { id: 'diamond', label: 'Diamant', stops: ['#E6FDFF', '#6FD3F0', '#3A7BD5'], shirt: '#2D3047', stars: true, unlock: { completed: 100 } },
];

export type AvatarConfig = {
  face: string;
  skin: string;
  hair: string;
  hairColor: string;
  eyeShape: string;
  eyes: string;
  brows: string;
  mouth: string;
  beard: string;
  hat: string;
  glasses: string;
  bg: string;
};

/** Every part of an avatar, in the order of its code, with its items. */
export const AVATAR_PARTS: { key: keyof AvatarConfig; items: Item[] }[] = [
  { key: 'face', items: FACES },
  { key: 'skin', items: SKINS },
  { key: 'hair', items: HAIR_STYLES },
  { key: 'hairColor', items: HAIR_COLORS },
  { key: 'eyeShape', items: EYE_SHAPES },
  { key: 'eyes', items: EYE_COLORS },
  { key: 'brows', items: BROWS },
  { key: 'mouth', items: MOUTHS },
  { key: 'beard', items: BEARDS },
  { key: 'hat', items: HATS },
  { key: 'glasses', items: GLASSES },
  { key: 'bg', items: BACKGROUNDS },
];

export const DEFAULT_AVATAR: AvatarConfig = {
  face: 'oval',
  skin: 'p2',
  hair: 'short',
  hairColor: 'brown',
  eyeShape: 'round',
  eyes: 'brown',
  brows: 'thick',
  mouth: 'smile',
  beard: 'none',
  hat: 'none',
  glasses: 'none',
  bg: 'violet',
};

const PREFIX = 'a2';

export function isAvatarCode(avatar: string): boolean {
  return avatar.startsWith(`${PREFIX}-`) || avatar.startsWith('a1-');
}

export function encodeAvatar(c: AvatarConfig): string {
  return [PREFIX, ...AVATAR_PARTS.map((p) => c[p.key])].join('-');
}

const pick = <T extends Item>(items: T[], id: string | undefined, fallback: string): T =>
  items.find((i) => i.id === id) ?? items.find((i) => i.id === fallback)!;

/** Reads an avatar code; unknown parts take the default. */
export function decodeAvatar(code: string): AvatarConfig {
  const [prefix, ...values] = code.split('-');
  if (prefix === 'a1') {
    // First drawn avatars: body-skin-hair-hairColor-eyes-hat-glasses-bg.
    const [body, skin, hair, hairColor, eyes, hat, glasses, bg] = values;
    const f = body === 'f';
    return decodeAvatar(
      encodeAvatar({
        ...DEFAULT_AVATAR,
        face: f ? 'oval' : 'square',
        eyeShape: f ? 'lashes' : 'round',
        brows: f ? 'thin' : 'thick',
        skin, hair, hairColor, eyes, hat, glasses, bg,
      }),
    );
  }
  const config = { ...DEFAULT_AVATAR };
  AVATAR_PARTS.forEach((p, i) => {
    config[p.key] = pick(p.items, values[i], DEFAULT_AVATAR[p.key]).id;
  });
  return config;
}

/** A random look among the items available from the start. */
export function randomAvatar(): AvatarConfig {
  const any = (items: Item[]) => {
    const free = items.filter((i) => !i.unlock);
    return free[Math.floor(Math.random() * free.length)].id;
  };
  const config = { ...DEFAULT_AVATAR };
  for (const p of AVATAR_PARTS) config[p.key] = any(p.items);
  // Mostly plain: accessories and beards now and then.
  if (Math.random() < 0.7) config.hat = 'none';
  if (Math.random() < 0.6) config.glasses = 'none';
  if (Math.random() < 0.6) config.beard = 'none';
  if (config.skin === 'emoji' && Math.random() < 0.8) config.skin = 'p3';
  return config;
}

/** What the player has done, for unlocks. */
export type Progress = { bestStreak: number; completed: number };

export function isUnlocked(item: { unlock?: Unlock }, progress: Progress): boolean {
  if (!item.unlock) return true;
  if ('streak' in item.unlock) return progress.bestStreak >= item.unlock.streak;
  return progress.completed >= item.unlock.completed;
}

/** "Flamme de 7 jours" / "10 listes publiques". */
export function unlockLabel(unlock: Unlock): string {
  if ('streak' in unlock) return `Flamme de ${unlock.streak} jour${unlock.streak > 1 ? 's' : ''}`;
  return `${unlock.completed} liste${unlock.completed > 1 ? 's' : ''} publique${unlock.completed > 1 ? 's' : ''}`;
}

// ——— Drawing (viewBox 0 0 120 120) ———
//
// Soft cartoon style: gradients for volume, thin warm outlines rather than black,
// organic shapes (tufts, locks) rather than plain geometry.

function mix(hex: string, other: string, amount: number): string {
  const a = hex.replace('#', '');
  const b = other.replace('#', '');
  const c = [0, 2, 4].map((i) => {
    const x = parseInt(a.slice(i, i + 2), 16);
    const y = parseInt(b.slice(i, i + 2), 16);
    return Math.round(x + (y - x) * amount)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${c.join('')}`;
}

const darker = (hex: string, amount = 0.25) => mix(hex, '#000000', amount);
const lighter = (hex: string, amount = 0.3) => mix(hex, '#FFFFFF', amount);
/** A warm dark tone for outlines: the colour itself, darkened towards brown. */
const outline = (hex: string) => mix(hex, '#3A1F14', 0.55);

/** Mirrors a path drawn on the left half to the right half (x → 120 − x). */
function mirror(d: string): string {
  // Paths here only use absolute commands with x,y pairs.
  return d.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+(120 - Number(x)).toFixed(2)} ${y}`);
}

/** Hair drawn behind the head (long styles), and in front of it. `paint`: fill and outline attributes. */
function hair(style: string, paint: string, strands: string, shine: string, fill: string, line: string): { back: string; front: string } {
  // Round curls: one outline around the whole mass, not around each curl.
  const curls = (list: [number, number, number][]) =>
    list.map(([x, y, r]) => `<circle fill="${line}" cx="${x}" cy="${y}" r="${r + 1}"/>`).join('') +
    list.map(([x, y, r]) => `<circle fill="${fill}" cx="${x}" cy="${y}" r="${r}"/>`).join('');
  const p = (d: string) => `<path ${paint} d="${d}"/>`;
  const lines = (d: string) => `<path ${strands} d="${d}"/>`;
  const gloss = (d: string) => `<path ${shine} d="${d}"/>`;
  const bunTop = 'M35 59 C33 42 44 31 60 31 C76 31 87 42 85 59 C82 50 77 45 70 43 C64 41.5 56 41.5 50 43 C43 45 38 50 35 59 Z';
  switch (style) {
    case 'short':
      return {
        back: '',
        front:
          p('M35 58 C33 43 40 31 52 28 C58 25 69 25 76 30 C83 34 87 44 85 58 C84 53 82 49 79 47 C77 50.5 73 50.5 70.5 47.5 C66 50.5 59 50.5 55.5 46.5 C51 49.5 44.5 49.5 41.5 47 C38.5 50 36.5 54 35 58 Z') +
          lines('M50 31 C53 35 55 40 55.5 45 M64 29.5 C67 33 69 39 70 45 M42 38 C42 41 42 44 41.5 46') +
          gloss('M48 31.5 C54 28.5 63 28 70 30.5 C63 30.5 55 31 48 33 Z'),
      };
    case 'quiff':
      return {
        back: '',
        front:
          p('M35 60 C32 45 37 34 46 29.5 C49 21.5 59 17.5 69 19 C79 20.5 86 27.5 84.5 36 C87 42 87 52 85 60 C83 54 81 50 77 48 C73 50.5 67 49.5 63 46.5 C57 49.5 48 49.5 42 47 C39 50 36.5 55 35 60 Z') +
          lines('M51 27 C58 22 69 21.5 77 26.5 M55 33.5 C62 29 71 29.5 78 35 M44 37 C44 41 43 44 42 47') +
          gloss('M53 23.5 C59 20.5 67 20.5 73 22.5 C66 22.5 59 23.5 53 26 Z'),
      };
    case 'curly': {
      const list: [number, number, number][] = [
        [36, 54, 6.5], [37.5, 44, 8], [44, 35.5, 8.5], [54, 30.5, 8.5], [66, 30.5, 8.5], [76, 35.5, 8.5], [82.5, 44, 8], [84, 54, 6.5],
        [47, 44, 7], [60, 41, 7.5], [73, 44, 7],
      ];
      return {
        back: '',
        front:
          curls(list) +
          list.map(([x, y, r]) => `<path ${strands} d="M${x - r * 0.4} ${y + r * 0.1} C${x - r * 0.3} ${y - r * 0.5} ${x + r * 0.4} ${y - r * 0.4} ${x + r * 0.3} ${y + r * 0.2}"/>`).join('') +
          `<circle ${shine} cx="52" cy="27" r="2.6"/><circle ${shine} cx="64.5" cy="27" r="2.6"/><circle ${shine} cx="42" cy="32.5" r="2"/>`,
      };
    }
    case 'buzz':
      return {
        back: '',
        front: p('M36.5 57 C36 41 46 31.5 60 31.5 C74 31.5 84 41 83.5 57 C81.5 51.5 78.5 48.5 75.5 46.5 C66 48.5 54 48.5 44.5 46.5 C41.5 48.5 38.5 51.5 36.5 57 Z').replace('<path', '<path opacity=".9"'),
      };
    case 'bald':
      return { back: '', front: `<path fill="#FFFFFF" opacity=".22" d="M48 37 C53 33.5 66 33.5 72 37 C65 36 55 36 48 37 Z"/>` };
    case 'long':
      return {
        back:
          p('M31 60 C29 40 42 27 60 27 C78 27 91 40 89 60 C89 72 91 84 94.5 94 C88 99 79 99.5 72 96.5 C71 86 70 76 69 68 L51 68 C50 76 49 86 48 96.5 C41 99.5 32 99 25.5 94 C29 84 31 72 31 60 Z') +
          lines('M34 72 C33.5 80 32 88 29.5 94 M86 72 C86.5 80 88 88 90.5 94 M38 76 C38 84 37.5 90 36.5 96'),
        front:
          p('M35 64 C32 46 41 31 58 30 C74 29 86 39 85.5 57 C85 61 84.5 64 84.5 66 C80.5 56 74.5 49 66.5 45.5 C60 52.5 48.5 58.5 35 64 Z') +
          lines('M66.5 45.5 C70 41 72 36.5 72.5 32 M60 50 C56 45 52.5 40 51 34') +
          gloss('M55 33.5 C62 31 70 31.5 76 34.5 C69 33.5 62 34 55 36 Z'),
      };
    case 'bob':
      return {
        back: p('M31 60 C30 40 42 28 60 28 C78 28 90 40 89 60 C89 68 90 76 92 82 C86 86.5 79 86.5 74 84.5 L72 70 L48 70 L46 84.5 C41 86.5 34 86.5 28 82 C30 76 31 68 31 60 Z'),
        front:
          p('M35 60 C33 42 44 31 60 31 C76 31 87 42 85 60 C84 55 82 51 79 49 C74.5 51.5 68.5 51.5 64.5 49 C59.5 51.5 52.5 51.5 48.5 49 C43.5 51.5 38.5 54.5 35 60 Z') +
          lines('M48.5 49 C49 44 51 39 54 35 M64.5 49 C65 44 66.5 39 69 35.5') +
          gloss('M47 35 C54 32 66 32 73 35 C66 34.5 54 34.5 47 37 Z'),
      };
    case 'bun':
      return {
        back:
          `<circle ${paint} cx="60" cy="26.5" r="9.5"/>` +
          lines('M54 25 C56 21 63 20.5 66 24 M55.5 30 C58 32 63 32 65 29.5') +
          `<circle ${shine} cx="56.5" cy="23" r="2.6"/>`,
        front: p(bunTop) + lines('M48 35 C52 38 54 41 55 44 M72 35 C68 38 66 41 65 44 M60 33 L60 42') + gloss('M50 34.5 C56 32.5 64 32.5 70 34.5 C64 34 56 34 50 36 Z'),
      };
    case 'afro': {
      const ring = Array.from({ length: 14 }, (_, k): [number, number, number] => {
        const a = (Math.PI * 2 * k) / 14;
        return [+(60 + Math.cos(a) * 29).toFixed(1), +(50 + Math.sin(a) * 29).toFixed(1), 10];
      });
      return {
        back:
          curls([...ring, [60, 50, 31]]) +
          ring.map(([x, y]) => `<path ${strands} d="M${x - 3} ${y + 1} C${x - 2} ${y - 3} ${x + 3} ${y - 3} ${x + 2.5} ${y + 1.5}"/>`).join('') + gloss('M40 32 C44 26 51 22.5 58 21.5 C52 24 46 28 42 34 Z'),
        front: p('M35.5 58 C35.5 44 45.5 36 60 36 C74.5 36 84.5 44 84.5 58 C80.5 51 75.5 48 71.5 47 C63.5 49 56.5 49 48.5 47 C44.5 48 39.5 51 35.5 58 Z'),
      };
    }
    case 'pony':
      return {
        back:
          p('M74 31 C86 28.5 96 37 96 51 C96 63 91 75 84 81 C81 83 78 81 79 78 C84 69 87 60 85 51 C84 44 80 39 74 37 Z') +
          lines('M85 44 C88 52 88 62 84 72') +
          `<circle fill="#FF7F9F" cx="77" cy="33.5" r="3.6"/>`,
        front: p(bunTop) + lines('M48 35 C52 38 54 41 55 44 M66 34 C70 36 74 39 77 43') + gloss('M50 34.5 C56 32.5 64 32.5 70 34.5 C64 34 56 34 50 36 Z'),
      };
    case 'mohawk':
      return {
        back: '',
        front:
          p('M36.5 56 C36.5 42 45.5 34 60 34 C74.5 34 83.5 42 83.5 56 C81.5 51 78.5 48 75.5 46 C66.5 48 53.5 48 44.5 46 C41.5 48 38.5 51 36.5 56 Z').replace('<path', '<path opacity=".55"') +
          p('M52 37 C51 31 51 25 53 19 C55 23 56.5 26 57 29 C57.5 23 59 17 62 12 C63.5 18 64 23 63.5 28 C65 25 67 22 70 20 C69.5 26 69 32 68 37 C63 39 57 39 52 37 Z'),
      };
    default:
      return { back: '', front: '' };
  }
}

function hat(id: string): string {
  switch (id) {
    case 'cap':
      return `<path fill="#E84D5B" stroke="#9E2433" stroke-width="1" d="M34 50 C34 35 45 26 60 26 C75 26 86 35 86 50 C70 47 50 47 34 50 Z"/>
<path fill="#C93847" stroke="#9E2433" stroke-width="1" d="M33 49 C50 45 70 45 87 49 C91 50 92 55 88 56 C70 52 50 52 32 56 C28 55 29 50 33 49 Z"/>
<path fill="none" stroke="#9E2433" stroke-width=".9" opacity=".6" d="M60 27 L60 46 M47 29.5 C44 35 43 41 43.5 47 M73 29.5 C76 35 77 41 76.5 47"/>
<path fill="#FFFFFF" opacity=".28" d="M43 34 C48 29 56 27.5 62 28 C55 29.5 48 32 43 36 Z"/>
<circle fill="#C93847" cx="60" cy="26.5" r="2.2"/>`;
    case 'beanie':
      return `<path fill="#4FB3A9" stroke="#2E7F77" stroke-width="1" d="M33 50 C33 33 45 23 60 23 C75 23 87 33 87 50 Z"/>
<rect fill="#3D968D" stroke="#2E7F77" stroke-width="1" x="31" y="45" width="58" height="10.5" rx="5.2"/>
<path stroke="#2E7F77" stroke-width="1.6" stroke-linecap="round" opacity=".5" fill="none" d="M37 47.5 v5.5 M43 47.5 v5.5 M49 47.5 v5.5 M55 47.5 v5.5 M61 47.5 v5.5 M67 47.5 v5.5 M73 47.5 v5.5 M79 47.5 v5.5 M85 47.5 v5.5"/>
<path fill="#FFFFFF" opacity=".22" d="M42 33 C47 27.5 55 25.5 61 26 C54 28 47 31 42 36 Z"/>
<circle fill="#F7F3EE" stroke="#D9D2C7" stroke-width="1" cx="60" cy="21" r="6"/>
<circle fill="#FFFFFF" cx="58" cy="19" r="2"/>`;
    case 'crown':
      return `<path fill="#FFC93C" stroke="#C98A10" stroke-width="1.3" stroke-linejoin="round" d="M40 42 L43 25 L52 34 L60 20 L68 34 L77 25 L80 42 Z"/>
<path fill="#FFE08A" d="M44 39 L45.5 30 L51 35.5 L53 36 L60 24.5 L56 36 Z" opacity=".7"/>
<rect fill="#E0A21B" stroke="#C98A10" stroke-width="1.2" x="39.5" y="40" width="41" height="6" rx="2"/>
<circle fill="#FF5F6D" cx="60" cy="43" r="2.2"/><circle fill="#4A8FE2" cx="49" cy="43" r="1.8"/><circle fill="#27B48F" cx="71" cy="43" r="1.8"/>
<circle fill="#FFFFFF" cx="59.3" cy="42.3" r=".7"/>`;
    case 'headphones':
      return `<path fill="none" stroke="#2D3047" stroke-width="5" stroke-linecap="round" d="M33 60 C31 38 43 26 60 26 C77 26 89 38 87 60"/>
<path fill="none" stroke="#4A4E6B" stroke-width="1.6" stroke-linecap="round" d="M36 46 C39 36 47 30 56 29"/>
<rect fill="#7C5CFF" stroke="#4E35C2" stroke-width="1" x="27" y="54" width="11" height="18" rx="5"/>
<rect fill="#7C5CFF" stroke="#4E35C2" stroke-width="1" x="82" y="54" width="11" height="18" rx="5"/>
<rect fill="#FFFFFF" opacity=".3" x="29" y="56.5" width="3" height="10" rx="1.5"/>
<rect fill="#FFFFFF" opacity=".3" x="84" y="56.5" width="3" height="10" rx="1.5"/>`;
    case 'wizard':
      return `<g transform="translate(0 -4)"><path fill="#5B3FE0" stroke="#3B24A8" stroke-width="1.2" stroke-linejoin="round" d="M35 47 C43 44 51 43 60 43 C69 43 77 44 85 47 C79 36 72 24 66 14 C64 11 60 11 59 14 C55 25 45 35 35 47 Z"/>
<path fill="#FFFFFF" opacity=".15" d="M60 15 C57 25 51 34 44 43 C50 42 54 42 57 42 C58 32 59 23 60 15 Z"/>
<path fill="#FFD166" d="M66 25 l1.5 3 3.3 .4 -2.4 2.3 .6 3.3 -3 -1.6 -3 1.6 .6 -3.3 -2.4 -2.3 3.3 -.4 z"/>
<circle fill="#FFD166" cx="56" cy="34" r="1.5"/><circle fill="#FFD166" cx="71" cy="39" r="1.2"/>
<ellipse fill="#4529B8" stroke="#3B24A8" stroke-width="1" cx="60" cy="47" rx="31" ry="5"/></g>`;
    case 'party':
      return `<path fill="#FF5F8F" stroke="#C92F60" stroke-width="1.2" stroke-linejoin="round" d="M45 41 L60 10 L75 41 C66 44 54 44 45 41 Z"/>
<path fill="#FFFFFF" opacity=".2" d="M58 15 L50 37 C52 38 54 38.5 55 38.6 Z"/>
<circle fill="#FFD166" cx="56" cy="30" r="2.2"/><circle fill="#7FE3A0" cx="63.5" cy="23" r="1.8"/><circle fill="#7FB8FF" cx="64" cy="35.5" r="2.1"/><circle fill="#FFD166" cx="52" cy="38.5" r="1.5"/><circle fill="#7FB8FF" cx="59.5" cy="19" r="1.3"/>
<circle fill="#FFD166" stroke="#E0A21B" stroke-width="1" cx="60" cy="10" r="4.2"/><circle fill="#FFFFFF" opacity=".6" cx="58.6" cy="8.6" r="1.3"/>`;
    case 'tophat':
      return `<rect fill="#2D3047" stroke="#14161F" stroke-width="1.2" x="45" y="12" width="30" height="30" rx="2.5"/>
<rect fill="#E84D5B" x="45.6" y="32" width="28.8" height="5.5"/>
<path fill="#FFFFFF" opacity=".16" d="M48.5 15 L52.5 15 L52.5 31 L48.5 31 Z"/>
<ellipse fill="#2D3047" stroke="#14161F" stroke-width="1.2" cx="60" cy="42.5" rx="25" ry="5"/>
<path fill="none" stroke="#FFFFFF" stroke-width="1" opacity=".18" d="M38 41.5 C48 39.5 72 39.5 82 41.5"/>`;
    case 'halo':
      return `<ellipse fill="none" stroke="#FFE08A" stroke-width="8" opacity=".35" cx="60" cy="18" rx="22" ry="6"/>
<ellipse fill="none" stroke="#FFC93C" stroke-width="3.4" cx="60" cy="18" rx="20" ry="5"/>
<ellipse fill="none" stroke="#FFF4C2" stroke-width="1" cx="60" cy="17.2" rx="18" ry="4"/>`;
    case 'horns': {
      const horn = 'M43 42 C38 35 35.5 26 37.5 15 C42 23 47.5 29 52.5 34.5 C49 36 45.5 38.5 43 42 Z';
      const shine = 'M40 20 C40.5 26 42.5 31 45.5 35 C42.5 32 40 27 40 20 Z';
      return `<g fill="#E8394D" stroke="#9E1F2E" stroke-width="1.2" stroke-linejoin="round"><path d="${horn}"/><path d="${mirror(horn)}"/></g>
<g fill="#FFFFFF" opacity=".35"><path d="${shine}"/><path d="${mirror(shine)}"/></g>`;
    }
    default:
      return '';
  }
}

/** A five-pointed star centred on (cx, cy). */
function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points = Array.from({ length: 10 }, (_, k) => {
    const r = k % 2 ? inner : outer;
    const a = -Math.PI / 2 + (Math.PI * k) / 5;
    return `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`;
  });
  return `M${points.join(' L')} Z`;
}

function glasses(id: string): string {
  switch (id) {
    case 'round':
      return `<g fill="#FFFFFF" fill-opacity=".14" stroke="#4A2F24" stroke-width="2.1">
<circle cx="49" cy="61" r="7.6"/><circle cx="71" cy="61" r="7.6"/></g>
<path stroke="#4A2F24" stroke-width="2.1" fill="none" stroke-linecap="round" d="M56.6 60.5 C58.6 58.8 61.4 58.8 63.4 60.5 M41.4 60 L36.5 58 M78.6 60 L83.5 58"/>
<path fill="#FFFFFF" opacity=".35" d="M44 57 C45.5 55 48 54.5 50 55 C47.5 56 45.5 57.5 44.5 59.5 Z M66 57 C67.5 55 70 54.5 72 55 C69.5 56 67.5 57.5 66.5 59.5 Z"/>`;
    case 'square':
      return `<g fill="#FFFFFF" fill-opacity=".14" stroke="#2D3047" stroke-width="2.3" stroke-linejoin="round">
<rect x="40" y="54.5" width="17" height="13" rx="4"/><rect x="63" y="54.5" width="17" height="13" rx="4"/></g>
<path stroke="#2D3047" stroke-width="2.3" fill="none" stroke-linecap="round" d="M57 59.5 C59 58 61 58 63 59.5 M40 58 L36 56.5 M80 58 L84 56.5"/>
<path fill="#FFFFFF" opacity=".35" d="M43 57 L48 57 L44 62 Z M66 57 L71 57 L67 62 Z"/>`;
    case 'sun':
      return `<defs><linearGradient id="lens" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3F5C"/><stop offset="1" stop-color="#14161F"/></linearGradient></defs>
<path fill="url(#lens)" stroke="#14161F" stroke-width="1" d="M38 55 L58 55 C58 63 55 68 48 68 C41 68 38 63 38 55 Z M62 55 L82 55 C82 63 79 68 72 68 C65 68 62 63 62 55 Z"/>
<path stroke="#14161F" stroke-width="2.4" fill="none" stroke-linecap="round" d="M57 56.5 C59 55 61 55 63 56.5 M38 56 L35 55 M82 56 L85 55"/>
<path fill="#FFFFFF" opacity=".35" d="M42 57 L48 57 L44 63 C42 61 42 59 42 57 Z M66 57 L72 57 L68 63 C66 61 66 59 66 57 Z"/>`;
    case 'heart':
      return `<g fill="#FF5F8F" stroke="#C92F60" stroke-width="1.4" stroke-linejoin="round">
<path d="M49 69 C43 65 39 61 39 57 C39 54 41 52 44 52 C46 52 48 53 49 55 C50 53 52 52 54 52 C57 52 59 54 59 57 C59 61 55 65 49 69 Z"/>
<path d="M71 69 C65 65 61 61 61 57 C61 54 63 52 66 52 C68 52 70 53 71 55 C72 53 74 52 76 52 C79 52 81 54 81 57 C81 61 77 65 71 69 Z"/></g>
<path stroke="#C92F60" stroke-width="2" fill="none" d="M58 58 C59 57 61 57 62 58"/>
<path fill="#FFFFFF" opacity=".5" d="M42.5 55.5 C43.5 54 45.5 54 46.5 55 C45 55.5 44 56.5 43.5 57.5 Z M64.5 55.5 C65.5 54 67.5 54 68.5 55 C67 55.5 66 56.5 65.5 57.5 Z"/>`;
    case 'star':
      return `<g fill="#FFC93C" stroke="#C98A10" stroke-width="1.3" stroke-linejoin="round"><path d="${starPath(49, 61.5, 10, 4.6)}"/><path d="${starPath(71, 61.5, 10, 4.6)}"/></g>
<g fill="#3A3F5C" opacity=".85"><circle cx="49" cy="62.3" r="3.6"/><circle cx="71" cy="62.3" r="3.6"/></g>
<path stroke="#C98A10" stroke-width="2" fill="none" stroke-linecap="round" d="M57.5 60 C59 58.6 61 58.6 62.5 60"/>
<g fill="#FFFFFF" opacity=".55"><circle cx="47.6" cy="61" r="1"/><circle cx="69.6" cy="61" r="1"/></g>`;
    default:
      return '';
  }
}

/**
 * Faces share the top of the head (forehead and temples, from one cheekbone at
 * (36, 58) to the other at (84, 58)), so every hairstyle fits every face; only the
 * jaw and chin change. `jaw` goes from the right cheekbone round the chin to the
 * left one; `chin` is the lowest point of the face.
 */
const HEAD_TOP = 'M36 58 C36 41 46 31 60 31 C74 31 84 41 84 58';
const EARS: [number, number] = [36.5, 83.5];
const FACE_SHAPES: Record<string, { jaw: string; chin: number }> = {
  oval: { jaw: 'C84 70 80 79 74.5 83.5 C70 87 65 88.5 60 88.5 C55 88.5 50 87 45.5 83.5 C40 79 36 70 36 58', chin: 88.5 },
  round: { jaw: 'C84.5 73 74 86 60 86 C46 86 35.5 73 36 58', chin: 86 },
  square: { jaw: 'C84 64 84 68 84 71 C84 79 80 84.5 73 86.5 C69 87.8 64.5 88.2 60 88.2 C55.5 88.2 51 87.8 47 86.5 C40 84.5 36 79 36 71 C36 68 36 64 36 58', chin: 88.2 },
  heart: { jaw: 'C83.5 67 79 76 71.5 82.5 C67 86.5 63.5 89.8 60 90.5 C56.5 89.8 53 86.5 48.5 82.5 C41 76 36.5 67 36 58', chin: 90.5 },
  long: { jaw: 'C84 72 81.5 82 75.5 87.5 C71 91.5 65.5 93 60 93 C54.5 93 49 91.5 44.5 87.5 C38.5 82 36 72 36 58', chin: 93 },
};

/** One eye centred on x (61.2 high), drawn with the iris gradient `iris`. */
function eye(shape: string, x: number, right: boolean, iris: string, skinFill: string, skinShade: string, line: string): string {
  const lidLine = (w: number, extra = '') =>
    `<path fill="none" stroke="#3B2621" stroke-width="${w}" stroke-linecap="round" d="M${x - 5.6} 60.2 C${x - 4.4} 55.2 ${x + 4.4} 55.2 ${x + 5.6} 60.2${extra}"/>`;
  const open = (ry: number) => `
<ellipse fill="#FFFFFF" stroke="${line}" stroke-width=".6" stroke-opacity=".5" cx="${x}" cy="61.2" rx="5.3" ry="${ry}"/>
<circle fill="${iris}" cx="${x + 0.2}" cy="61.9" r="${Math.min(3.7, ry - 0.6)}"/>
<circle fill="#1E1614" cx="${x + 0.25}" cy="62" r="1.8"/>
<circle fill="#FFFFFF" cx="${x + 1.5}" cy="60.4" r="1.25"/>
<circle fill="#FFFFFF" opacity=".8" cx="${x - 1.2}" cy="63.4" r=".55"/>`;
  const outer = right ? x + 5.6 : x - 5.6;
  const flick = right ? 2.1 : -2.1;
  const closed = `<path fill="none" stroke="#3B2621" stroke-width="1.8" stroke-linecap="round" d="M${x - 4.8} 61.8 C${x - 2.5} 58.4 ${x + 2.5} 58.4 ${x + 4.8} 61.8"/>`;
  switch (shape) {
    case 'lashes':
      return open(5.6) + lidLine(1.9, ` M${outer} 60.2 L${outer + flick} 58.6`);
    case 'almond':
      return (
        open(4.2) +
        `<path fill="none" stroke="#3B2621" stroke-width="1.5" stroke-linecap="round" d="M${x - 5.8} 61.6 C${x - 3.5} 57.4 ${x + 3} 56.8 ${x + 5.8} 60.2"/>`
      );
    case 'sleepy':
      return (
        open(5.6) +
        `<path fill="${skinFill}" stroke="${skinShade}" stroke-width=".8" d="M${x - 5.6} 61 C${x - 5} 55 ${x + 5} 55 ${x + 5.6} 61 C${x + 3} 60 ${x - 3} 60 ${x - 5.6} 61 Z"/>` +
        `<path fill="none" stroke="#3B2621" stroke-width="1.5" stroke-linecap="round" d="M${x - 5.6} 61 C${x - 3} 60 ${x + 3} 60 ${x + 5.6} 61"/>`
      );
    case 'happy':
      return closed;
    case 'wink':
      return right ? closed : open(5.6) + lidLine(1.3);
    default:
      return open(5.6) + lidLine(1.3);
  }
}

function brows(id: string, fill: string): string {
  const both = (d: string) => `<path fill="${fill}" d="${d}"/><path fill="${fill}" d="${mirror(d)}"/>`;
  switch (id) {
    case 'thin':
      return both('M42.8 52.6 C45.6 49.6 50.4 49 54.4 50.4 C54.9 51.1 54.6 51.8 53.8 51.8 C50.2 51.2 46.6 51.8 43.8 53.6 C43.1 54 42.4 53.2 42.8 52.6 Z');
    case 'arched':
      return both('M42.6 54 C44.4 49 49.6 46.8 54.6 49.6 C55.2 50.2 54.8 51.2 54 51 C50 49.4 46.2 50.8 44 54.6 C43.5 55.2 42.4 54.8 42.6 54 Z');
    case 'flat':
      return both('M42.6 51.6 C46.4 50.6 50.6 50.4 54.6 50.8 C55.4 51 55.4 52.6 54.6 52.7 C50.6 52.6 46.6 52.9 43 53.6 C42 53.7 41.8 51.9 42.6 51.6 Z');
    case 'bushy':
      return both('M41.6 53 C44.4 48.4 50.6 47.4 55.4 49.4 C56.4 50 56 52.6 54.8 52.6 C51 52 47 52.6 43.8 54.9 C42.6 55.6 41 54.2 41.6 53 Z M44 50.6 L43 49 M48 49 L47.6 47.4 M52 48.8 L52.4 47.2');
    case 'raised':
      return (
        `<path fill="${fill}" d="M42.2 52.8 C45.4 49.2 50.6 48.6 54.8 50.2 C55.4 51 55.1 52.2 54.1 52.2 C50.4 51.5 46.6 52.2 43.6 54.4 C42.7 54.9 41.8 53.6 42.2 52.8 Z"/>` +
        `<path fill="${fill}" d="${mirror('M42.4 50.6 C44.6 45.6 50.4 44.6 54.8 47 C55.4 47.8 55 48.9 54 48.7 C50.4 47.3 46.4 48.2 44 51.8 C43.3 52.6 42 51.6 42.4 50.6 Z')}"/>`
      );
    default:
      return both('M42.2 52.8 C45.4 49.2 50.6 48.6 54.8 50.2 C55.4 51 55.1 52.2 54.1 52.2 C50.4 51.5 46.6 52.2 43.6 54.4 C42.7 54.9 41.8 53.6 42.2 52.8 Z');
  }
}

function mouth(id: string, skinShade: string): string {
  const corners = `<path fill="none" stroke="${skinShade}" stroke-width="1.1" stroke-linecap="round" opacity=".7" d="M51.6 72 C52.2 71.6 52.8 71.6 53.3 72 M68.4 72 C67.8 71.6 67.2 71.6 66.7 72"/>`;
  const line = darker(skinShade, 0.3);
  switch (id) {
    case 'closed':
      return `<path fill="none" stroke="${darker(skinShade, 0.45)}" stroke-width="1.8" stroke-linecap="round" d="M53.5 73 C56.5 76.4 63.5 76.4 66.5 73"/>` + corners;
    case 'grin':
      return `<path fill="#7A2E3A" stroke="${line}" stroke-width=".8" stroke-linejoin="round" d="M51.5 71.6 C54 81.5 66 81.5 68.5 71.6 C63 73.2 57 73.2 51.5 71.6 Z"/>
<path fill="#FFFFFF" d="M53.4 72.6 C57.6 73.9 62.4 73.9 66.6 72.6 L66 74.4 C62 75.4 58 75.4 54 74.4 Z"/>
<path fill="#E8798A" d="M55.5 78.2 C57.5 76.4 62.5 76.4 64.5 78.2 C62.5 79.6 57.5 79.6 55.5 78.2 Z"/>`;
    case 'smirk':
      return `<path fill="none" stroke="${darker(skinShade, 0.45)}" stroke-width="1.8" stroke-linecap="round" d="M53.5 74.6 C57.5 75.6 62.5 75 66.8 71.6"/>
<path fill="none" stroke="${skinShade}" stroke-width="1.1" stroke-linecap="round" opacity=".7" d="M67.6 70.8 C67.4 71.6 67.8 72.4 68.4 72.6"/>`;
    case 'lips':
      return `<path fill="#D9576A" stroke="#B53E52" stroke-width=".7" stroke-linejoin="round" d="M53 73 C55 71.4 57.6 71 60 72 C62.4 71 65 71.4 67 73 C64.5 77.6 55.5 77.6 53 73 Z"/>
<path fill="none" stroke="#9E2F43" stroke-width=".9" stroke-linecap="round" d="M53.6 73.2 C57 74.4 63 74.4 66.4 73.2"/>
<path fill="#FFFFFF" opacity=".45" d="M57 75.4 C58.6 76 61.4 76 63 75.4 C61.4 76.6 58.6 76.6 57 75.4 Z"/>`;
    case 'o':
      return `<ellipse fill="#7A2E3A" stroke="${line}" stroke-width=".8" cx="60" cy="74.6" rx="2.6" ry="3.2"/>
<ellipse fill="#E8798A" cx="60" cy="76.2" rx="1.6" ry="1"/>`;
    case 'tongue':
      return `<path fill="#7A2E3A" stroke="${line}" stroke-width=".8" stroke-linejoin="round" d="M53 72.6 C56 77.4 64 77.4 67 72.6 C64 74.2 56 74.2 53 72.6 Z"/>
<path fill="#EE7F92" stroke="#C9566C" stroke-width=".8" d="M57.4 75.2 C57.4 80.4 62.8 80.4 62.8 75.6 C61 76.6 59 76.4 57.4 75.2 Z"/>
<path fill="none" stroke="#C9566C" stroke-width=".7" stroke-linecap="round" d="M60.1 76.3 L60.1 78.4"/>` + corners;
    default:
      return `<path fill="#7A2E3A" stroke="${line}" stroke-width=".8" stroke-linejoin="round" d="M53 72.6 C56 78 64 78 67 72.6 C64 74.2 56 74.2 53 72.6 Z"/>
<path fill="#FFFFFF" d="M55.4 73.6 C58.4 74.6 61.6 74.6 64.6 73.6 L64.1 74.6 C61.3 75.4 58.7 75.4 55.9 74.6 Z"/>
<ellipse fill="#E8798A" cx="60" cy="76" rx="3.1" ry="1.1"/>` + corners;
  }
}

/**
 * Facial hair: what grows on the jaw (drawn under the mouth) and the moustache
 * (drawn over it). Beards follow the face's own jaw line on the outside, and a
 * curve around the mouth and cheeks on the inside, so they fit every face. A full
 * beard also goes past the face: the jaw line, a little bigger, drawn behind it.
 */
function beard(id: string, paint: string, strands: string, fill: string, face: { jaw: string; chin: number }, faceClip: string): { behind: string; jaw: string; mustache: string } {
  const mustache = `<path ${paint} d="M51.5 71.2 C53.6 68.4 57.4 68.2 60 70 C62.6 68.2 66.4 68.4 68.5 71.2 C66 72.2 63 72.2 60 71.3 C57 72.2 54 72.2 51.5 71.2 Z"/>`;
  // From the right cheekbone along the jaw to the left one, then back inside.
  const along = (inside: string) => `M84 58 ${face.jaw} ${inside} Z`;
  const short = along('L40 59 C40 68 45.5 76.5 52 78.6 C55 79.6 57.5 80.2 60 80.2 C62.5 80.2 65 79.6 68 78.6 C74.5 76.5 80 68 80 59');
  const full = along('L40.5 58 C41 66 46 72 52 73.6 C55 74.4 57.5 74.7 60 74.7 C62.5 74.7 65 74.4 68 73.6 C74 72 79 66 79.5 58');
  const c = face.chin;
  switch (id) {
    case 'stubble':
      return {
        behind: '',
        jaw: `<g clip-path="${faceClip}" opacity=".22"><path fill="${fill}" d="${short}"/>` +
          `<path fill="${fill}" d="M51 70.6 C54 68.6 57.6 68.8 60 70 C62.4 68.8 66 68.6 69 70.6 C66 71.4 54 71.4 51 70.6 Z"/></g>`,
        mustache: '',
      };
    case 'mustache':
      return { behind: '', jaw: '', mustache };
    case 'goatee':
      return {
        behind: '',
        jaw: `<path ${paint} d="M54.2 78.4 C54.8 ${c - 4} 57 ${c - 0.8} 60 ${c - 0.8} C63 ${c - 0.8} 65.2 ${c - 4} 65.8 78.4 C63.8 80 56.2 80 54.2 78.4 Z"/>` +
          `<path ${strands} d="M58 81 L58.3 ${c - 2.5} M62 81 L61.7 ${c - 2.5}"/>`,
        mustache,
      };
    case 'short':
      return {
        behind: '',
        jaw: `<g clip-path="${faceClip}"><path ${paint} d="${short}"/><path ${strands} d="M44 79 L45.5 82 M50 ${c - 6} L50.8 ${c - 3} M70 ${c - 6} L69.2 ${c - 3} M76 79 L74.5 82"/></g>`,
        mustache,
      };
    case 'full':
      return {
        behind: `<path ${paint} transform="translate(60 58) scale(1.05 1.13) translate(-60 -58)" d="M84 58 ${face.jaw} Z"/>`,
        jaw:
          `<g clip-path="${faceClip}"><path ${paint} d="${full}"/>` +
          `<path ${strands} d="M42 70 L43.5 75 M48 78 L49.5 83 M55 ${c - 5} L55.6 ${c - 1} M65 ${c - 5} L64.4 ${c - 1} M72 78 L70.5 83 M78 70 L76.5 75"/></g>`,
        mustache,
      };
    case 'handlebar':
      return {
        behind: '',
        jaw: '',
        mustache: `<path ${paint} d="M50 70.5 C47.5 70 46.5 67.5 48 66.4 C48.6 68.4 50 69 52 68.8 C55 67.6 58 68 60 69.6 C62 68 65 67.6 68 68.8 C70 69 71.4 68.4 72 66.4 C73.5 67.5 72.5 70 70 70.5 C66.5 71.6 63 71.8 60 71 C57 71.8 53.5 71.6 50 70.5 Z"/>`,
      };
    default:
      return { behind: '', jaw: '', mustache: '' };
  }
}

/** Part of the drawing to show, for close-ups (e.g. on the eyes): square from (x, y). */
export type AvatarZoom = { x: number; y: number; size: number };

/** SVG markup of an avatar (round). `uid` keeps its gradient ids apart from other avatars'. */
export function avatarSvg(c: AvatarConfig, uid = 'a', zoom: AvatarZoom = { x: 8, y: 12, size: 104 }): string {
  const skin = pick(SKINS, c.skin, DEFAULT_AVATAR.skin);
  const hairFill = pick(HAIR_COLORS, c.hairColor, DEFAULT_AVATAR.hairColor).fill;
  const eyeFill = pick(EYE_COLORS, c.eyes, DEFAULT_AVATAR.eyes).fill;
  const bg = pick(BACKGROUNDS, c.bg, DEFAULT_AVATAR.bg);
  const face = FACE_SHAPES[c.face] ?? FACE_SHAPES.oval;
  const id = (name: string) => `${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;

  const skinLine = outline(skin.shade);
  const hairLine = outline(hairFill);
  const hairPaint = `fill="${url('hair')}" stroke="${hairLine}" stroke-width="1" stroke-linejoin="round"`;
  const hairStrands = `fill="none" stroke="${darker(hairFill, 0.28)}" stroke-width="1.1" stroke-linecap="round" opacity=".45"`;
  const h = hair(c.hair, hairPaint, hairStrands, `fill="#FFFFFF" opacity=".28"`, url('hair'), hairLine);
  const b = beard(c.beard, hairPaint, hairStrands, url('hair'), face, url('face'));
  const browFill = darker(hairFill, c.hairColor === 'grey' || c.hairColor === 'blond' ? 0.4 : 0.12);
  const stops = bg.stops.map((s, i) => `<stop offset="${i / (bg.stops.length - 1)}" stop-color="${s}"/>`).join('');
  const stars = bg.stars
    ? [[22, 30, 1.2], [92, 24, 1.6], [100, 56, 1], [17, 66, 1.4], [30, 92, 1], [96, 90, 1.2], [78, 18, 1]]
        .map(([x, y, r]) => `<circle fill="#FFFFFF" opacity=".85" cx="${x}" cy="${y}" r="${r}"/>`)
        .join('')
    : '';
  const [earL, earR] = EARS;
  const faceD = `${HEAD_TOP} ${face.jaw} Z`;
  const half = zoom.size / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${zoom.x} ${zoom.y} ${zoom.size} ${zoom.size}">
<defs>
<linearGradient id="${id('bg')}" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
<radialGradient id="${id('glow')}" cx=".5" cy=".42" r=".5"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".38"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
<radialGradient id="${id('skin')}" cx=".42" cy=".36" r=".72"><stop offset="0" stop-color="${lighter(skin.fill, 0.14)}"/><stop offset=".6" stop-color="${skin.fill}"/><stop offset="1" stop-color="${mix(skin.fill, skin.shade, 0.55)}"/></radialGradient>
<linearGradient id="${id('hair')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighter(hairFill, 0.14)}"/><stop offset="1" stop-color="${darker(hairFill, 0.12)}"/></linearGradient>
<radialGradient id="${id('iris')}" cx=".5" cy=".7" r=".6"><stop offset="0" stop-color="${lighter(eyeFill, 0.35)}"/><stop offset="1" stop-color="${darker(eyeFill, 0.15)}"/></radialGradient>
<radialGradient id="${id('blush')}"><stop offset="0" stop-color="#FF7F7A" stop-opacity=".5"/><stop offset="1" stop-color="#FF7F7A" stop-opacity="0"/></radialGradient>
<linearGradient id="${id('shirt')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lighter(bg.shirt, 0.12)}"/><stop offset="1" stop-color="${darker(bg.shirt, 0.1)}"/></linearGradient>
<clipPath id="${id('clip')}"><circle cx="${zoom.x + half}" cy="${zoom.y + half}" r="${half}"/></clipPath>
<clipPath id="${id('face')}"><path d="${faceD}"/></clipPath>
</defs>
<g clip-path="${url('clip')}">
<rect width="120" height="130" fill="${url('bg')}"/>
<circle cx="60" cy="56" r="48" fill="${url('glow')}"/>${stars}
${h.back}
<path fill="${skin.shade}" stroke="${skinLine}" stroke-width=".8" stroke-opacity=".5" d="M51 76 C51.5 83 51 88 48.5 92 C47.5 93.6 46 95 44 96.5 L44 106 L76 106 L76 96.5 C74 95 72.5 93.6 71.5 92 C69 88 68.5 83 69 76 Z"/>
<path fill="${darker(skin.shade, 0.12)}" opacity=".5" d="M51 82 C55 86 65 86 69 82 L69 86 C64 89 56 89 51 86 Z"/>
<path fill="${url('shirt')}" stroke="${outline(bg.shirt)}" stroke-width="1" stroke-opacity=".5" d="M13 128 C13 107 29 96 47.5 93.5 C51.5 97.5 55.5 99.5 60 99.5 C64.5 99.5 68.5 97.5 72.5 93.5 C91 96 107 107 107 128 Z"/>
<path fill="none" stroke="${darker(bg.shirt, 0.18)}" stroke-width="1.6" stroke-linecap="round" d="M47.5 93.5 C51.5 97.5 55.5 99.5 60 99.5 C64.5 99.5 68.5 97.5 72.5 93.5"/>
${b.behind}
<g stroke="${skinLine}" stroke-width=".8" stroke-opacity=".55">
<ellipse fill="${skin.fill}" cx="${earL}" cy="62" rx="5.2" ry="6.8"/>
<ellipse fill="${skin.fill}" cx="${earR}" cy="62" rx="5.2" ry="6.8"/></g>
<path fill="none" stroke="${skin.shade}" stroke-width="1.5" stroke-linecap="round" d="M${earL + 1.6} 59 C${earL - 1.6} 59.5 ${earL - 1.8} 64 ${earL + 0.8} 65.5 M${earR - 1.6} 59 C${earR + 1.6} 59.5 ${earR + 1.8} 64 ${earR - 0.8} 65.5"/>
<path fill="${url('skin')}" stroke="${skinLine}" stroke-width="1" stroke-opacity=".45" d="${faceD}"/>
<ellipse fill="${url('blush')}" cx="45" cy="70.5" rx="6.5" ry="4.2"/>
<ellipse fill="${url('blush')}" cx="75" cy="70.5" rx="6.5" ry="4.2"/>
${b.jaw}
${eye(c.eyeShape, 49, false, url('iris'), skin.fill, skin.shade, skinLine)}
${eye(c.eyeShape, 71, true, url('iris'), skin.fill, skin.shade, skinLine)}
${brows(c.brows, browFill)}
<path fill="${skin.shade}" opacity=".55" d="M57.6 66.6 C58.4 69.4 61.6 69.4 62.4 66.6 C61.4 67.8 58.6 67.8 57.6 66.6 Z"/>
<path fill="#FFFFFF" opacity=".35" d="M59.2 63 C59.6 64.4 60.4 64.4 60.8 63 Z"/>
${mouth(c.mouth, skin.shade)}
${b.mustache}
${h.front}
${glasses(c.glasses)}
${hat(c.hat)}
</g>
</svg>`;
}
