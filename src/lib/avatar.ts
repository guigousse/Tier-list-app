/**
 * Player avatars drawn in SVG, from a few choices: body, skin, hair (style and
 * colour), eyes, hat, glasses and background. Stored as a short code on the
 * profile ("a1-f-p2-long-blond-blue-none-round-violet"), so new items can be added
 * later without breaking saved avatars: unknown ids fall back to the defaults.
 *
 * Some items are locked at first and unlocked by playing (daily streak, number of
 * tier lists completed).
 */

export type Unlock = { streak: number } | { completed: number };

type Item = { id: string; label: string; unlock?: Unlock };

export type Body = Item & { id: 'm' | 'f' };
export type Skin = Item & { fill: string; shade: string };
export type HairStyle = Item;
export type HairColor = Item & { fill: string };
export type EyeColor = Item & { fill: string };
export type Accessory = Item;
export type Background = Item & { stops: string[]; shirt: string; stars?: boolean };

export const BODIES: Body[] = [
  { id: 'm', label: 'Homme' },
  { id: 'f', label: 'Femme' },
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
];

export const HAIR_STYLES: HairStyle[] = [
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
];

export const EYE_COLORS: EyeColor[] = [
  { id: 'brown', label: 'Marron', fill: '#6B3F21' },
  { id: 'hazel', label: 'Noisette', fill: '#977233' },
  { id: 'green', label: 'Vert', fill: '#3F915B' },
  { id: 'blue', label: 'Bleu', fill: '#3B80DB' },
  { id: 'grey', label: 'Gris', fill: '#7D8B97' },
  { id: 'violet', label: 'Violet', fill: '#8B5CF6', unlock: { streak: 14 } },
  { id: 'gold', label: 'Or', fill: '#E0A21B', unlock: { completed: 25 } },
];

export const HATS: Accessory[] = [
  { id: 'none', label: 'Aucun' },
  { id: 'cap', label: 'Casquette' },
  { id: 'beanie', label: 'Bonnet' },
  { id: 'crown', label: 'Couronne', unlock: { streak: 7 } },
  { id: 'headphones', label: 'Casque', unlock: { completed: 10 } },
  { id: 'wizard', label: 'Sorcier', unlock: { streak: 30 } },
];

export const GLASSES: Accessory[] = [
  { id: 'none', label: 'Aucunes' },
  { id: 'round', label: 'Rondes' },
  { id: 'square', label: 'Carrées' },
  { id: 'sun', label: 'Soleil', unlock: { completed: 5 } },
  { id: 'heart', label: 'Cœur', unlock: { streak: 14 } },
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
];

export type AvatarConfig = {
  body: Body['id'];
  skin: string;
  hair: string;
  hairColor: string;
  eyes: string;
  hat: string;
  glasses: string;
  bg: string;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  body: 'm',
  skin: 'p2',
  hair: 'short',
  hairColor: 'brown',
  eyes: 'brown',
  hat: 'none',
  glasses: 'none',
  bg: 'violet',
};

/** Default look for a body: the hair changes with it. */
export function avatarForBody(config: AvatarConfig, body: Body['id']): AvatarConfig {
  const hair = config.body === body ? config.hair : body === 'f' ? 'long' : 'short';
  return { ...config, body, hair };
}

const PREFIX = 'a1';

export function isAvatarCode(avatar: string): boolean {
  return avatar.startsWith(`${PREFIX}-`);
}

export function encodeAvatar(c: AvatarConfig): string {
  return [PREFIX, c.body, c.skin, c.hair, c.hairColor, c.eyes, c.hat, c.glasses, c.bg].join('-');
}

const pick = <T extends Item>(items: T[], id: string | undefined, fallback: string): T =>
  items.find((i) => i.id === id) ?? items.find((i) => i.id === fallback)!;

/** Reads an avatar code; unknown parts take the default. */
export function decodeAvatar(code: string): AvatarConfig {
  const [, body, skin, hair, hairColor, eyes, hat, glasses, bg] = code.split('-');
  const d = DEFAULT_AVATAR;
  return {
    body: pick(BODIES, body, d.body).id,
    skin: pick(SKINS, skin, d.skin).id,
    hair: pick(HAIR_STYLES, hair, d.hair).id,
    hairColor: pick(HAIR_COLORS, hairColor, d.hairColor).id,
    eyes: pick(EYE_COLORS, eyes, d.eyes).id,
    hat: pick(HATS, hat, d.hat).id,
    glasses: pick(GLASSES, glasses, d.glasses).id,
    bg: pick(BACKGROUNDS, bg, d.bg).id,
  };
}

/** A random look among the items available from the start. */
export function randomAvatar(): AvatarConfig {
  const free = <T extends Item>(items: T[]) => items.filter((i) => !i.unlock);
  const any = <T extends Item>(items: T[]) => {
    const list = free(items);
    return list[Math.floor(Math.random() * list.length)].id;
  };
  const body = Math.random() < 0.5 ? 'm' : 'f';
  const hairs = body === 'f' ? ['long', 'bob', 'bun', 'curly', 'afro'] : ['short', 'quiff', 'curly', 'buzz', 'afro'];
  return {
    body,
    skin: free(SKINS).filter((s) => s.id !== 'emoji')[Math.floor(Math.random() * 6)].id,
    hair: hairs[Math.floor(Math.random() * hairs.length)],
    hairColor: any(HAIR_COLORS),
    eyes: any(EYE_COLORS),
    hat: 'none',
    glasses: Math.random() < 0.25 ? 'round' : 'none',
    bg: any(BACKGROUNDS),
  };
}

/** What the player has done, for unlocks. */
export type Progress = { bestStreak: number; completed: number };

export function isUnlocked(item: { unlock?: Unlock }, progress: Progress): boolean {
  if (!item.unlock) return true;
  if ('streak' in item.unlock) return progress.bestStreak >= item.unlock.streak;
  return progress.completed >= item.unlock.completed;
}

/** "Série de 7 jours" / "10 listes complétées". */
export function unlockLabel(unlock: Unlock): string {
  if ('streak' in unlock) return `Série de ${unlock.streak} jours`;
  return `${unlock.completed} listes complétées`;
}

// ——— Drawing (viewBox 0 0 120 120) ———

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

/** Hair drawn behind the head (long styles), and in front of it. */
function hair(style: string, body: Body['id'], fill: string): { back: string; front: string } {
  const shine = `fill="${lighter(fill, 0.22)}"`;
  const f = `fill="${fill}"`;
  switch (style) {
    case 'short':
      return {
        back: '',
        front: `<path ${f} d="M34 60c-2-19 9-32 26-32s28 13 26 32c-1-6-3-10-6-13-7 4-25 5-35 1-6 3-9 7-11 12z"/>
<path ${shine} opacity=".5" d="M47 33c6-2 15-2 21 0-6 1-14 2-21 0z"/>`,
      };
    case 'quiff':
      return {
        back: '',
        front: `<path ${f} d="M34 61c-3-17 5-28 16-32 3-6 12-9 22-6 9 3 15 10 14 19 2 5 1 12 0 19-1-7-4-12-8-15-10 2-24 2-32-1-6 3-10 9-12 16z"/>
<path ${shine} opacity=".55" d="M52 28c5-4 13-5 19-2-6 0-13 1-19 2z"/>`,
      };
    case 'curly': {
      const curls = [
        [36, 52, 7], [38, 42, 8], [45, 34, 8], [55, 30, 8.5], [66, 30, 8.5], [76, 34, 8], [83, 42, 8], [85, 52, 7],
        [48, 42, 7], [60, 39, 7], [72, 42, 7],
      ]
        .map(([x, y, r]) => `<circle ${f} cx="${x}" cy="${y}" r="${r}"/>`)
        .join('');
      const shines = [[53, 27, 3], [65, 27, 3], [42, 37, 2.5]].map(([x, y, r]) => `<circle ${shine} opacity=".5" cx="${x}" cy="${y}" r="${r}"/>`).join('');
      return { back: '', front: curls + shines };
    }
    case 'buzz':
      return {
        back: '',
        front: `<path ${f} opacity=".85" d="M36 56c0-16 10-25 24-25s24 9 24 25c-2-6-5-9-8-11-9 2-23 2-32 0-3 2-6 5-8 11z"/>`,
      };
    case 'bald':
      return { back: '', front: `<path fill="#FFFFFF" opacity=".18" d="M48 36c6-4 18-4 24 0-7-1-17-1-24 0z"/>` };
    case 'long':
      return {
        back: `<path ${f} d="M30 62c-2-22 10-36 30-36s32 14 30 36l2 34c-8 4-16 4-22 2l-2-30H52l-2 30c-6 2-14 2-22-2z"/>`,
        front: `<path ${f} d="M35 64c-3-20 8-34 25-34 18 0 29 13 26 32-6-8-12-14-18-17-6 7-18 12-33 19z"/>
<path ${shine} opacity=".5" d="M56 33c6-2 13-1 18 2-6-1-12-1-18-2z"/>`,
      };
    case 'bob':
      return {
        back: `<path ${f} d="M31 62c-2-22 10-35 29-35s31 13 29 35l1 20c-5 3-11 3-15 1l-1-14H46l-1 14c-4 2-10 2-15-1z"/>`,
        front: `<path ${f} d="M35 62c-2-19 9-31 25-31s27 12 25 31c-3-8-6-12-9-14-5 3-11 4-18 3-8-1-14 2-17 7z"/>
<path ${shine} opacity=".5" d="M48 35c7-3 17-3 24 0-8 0-16 0-24 0z"/>`,
      };
    case 'bun':
      return {
        back: `<circle ${f} cx="60" cy="27" r="9.5"/><circle ${shine} opacity=".45" cx="56.5" cy="23.5" r="3"/>`,
        front: `<path ${f} d="M34 60c-2-19 9-31 26-31s28 12 26 31c-2-8-5-12-9-14-9 3-25 3-34 0-4 2-7 6-9 14z"/>
<path ${shine} opacity=".5" d="M48 34c7-3 17-3 24 0-8 0-16 0-24 0z"/>`,
      };
    case 'afro':
      return {
        back: `<circle ${f} cx="60" cy="50" r="36"/><circle ${shine} opacity=".25" cx="46" cy="28" r="9"/>`,
        front: `<path ${f} d="M35 58c0-14 10-22 25-22s25 8 25 22c-4-7-9-10-13-11-8 2-16 2-24 0-4 1-9 4-13 11z"/>`,
      };
    case 'pony':
      return {
        back: `<path ${f} d="M74 32c12-2 22 6 22 20 0 12-5 24-12 30-3 2-6 0-5-3 5-9 8-18 6-27-1-7-5-12-11-13z"/><circle fill="${darker(fill, 0.2)}" cx="77" cy="33" r="4"/>`,
        front: `<path ${f} d="M34 60c-2-19 9-31 26-31s28 12 26 31c-2-8-5-12-9-14-9 3-25 3-34 0-4 2-7 6-9 14z"/>
<path ${shine} opacity=".5" d="M48 34c7-3 17-3 24 0-8 0-16 0-24 0z"/>`,
      };
    case 'mohawk':
      return {
        back: '',
        front: `<path ${f} opacity=".55" d="M36 56c0-14 9-22 24-22s24 8 24 22c-2-5-5-8-8-10-9 2-23 2-32 0-3 2-6 5-8 10z"/>
<path ${f} d="M52 34l2-14 4 8 2-14 4 12 3-9 1 17c-5 2-11 2-16 0z"/>`,
      };
    default:
      return { back: '', front: '' };
  }
}

function hat(id: string, body: Body['id']): string {
  switch (id) {
    case 'cap':
      return `<path fill="#E84D5B" d="M34 50c0-15 11-24 26-24s26 9 26 24c-16-3-36-3-52 0z"/>
<path fill="#C93847" d="M33 49c17-4 37-4 54 0 4 1 5 6 1 7-18-4-38-4-56 0-4-1-3-6 1-7z"/>
<path fill="#FFFFFF" opacity=".25" d="M44 33c6-4 14-5 20-4-7 1-14 3-20 4z"/>
<circle fill="#C93847" cx="60" cy="26.5" r="2.2"/>`;
    case 'beanie':
      return `<path fill="#4FB3A9" d="M33 50c0-17 12-27 27-27s27 10 27 27z"/>
<rect fill="#3D968D" x="31" y="45" width="58" height="10" rx="5"/>
<path stroke="#3D968D" stroke-width="2" stroke-linecap="round" opacity=".6" d="M45 28v15M53 25v18M61 24v19M69 25v18M77 28v15"/>
<circle fill="#F2F4F8" cx="60" cy="21" r="6"/>`;
    case 'crown':
      return `<path fill="#FFC93C" stroke="#E0A21B" stroke-width="1.5" stroke-linejoin="round" d="M40 42l3-17 9 9 8-14 8 14 9-9 3 17z"/>
<rect fill="#E0A21B" x="39.5" y="40" width="41" height="6" rx="2"/>
<circle fill="#FF5F6D" cx="60" cy="43" r="2.2"/><circle fill="#4A8FE2" cx="49" cy="43" r="1.8"/><circle fill="#27B48F" cx="71" cy="43" r="1.8"/>`;
    case 'headphones':
      return `<path fill="none" stroke="#2D3047" stroke-width="5" stroke-linecap="round" d="M33 60c-2-22 10-34 27-34s29 12 27 34"/>
<rect fill="#7C5CFF" x="27" y="54" width="11" height="18" rx="5"/>
<rect fill="#7C5CFF" x="82" y="54" width="11" height="18" rx="5"/>
<rect fill="#FFFFFF" opacity=".25" x="29" y="56" width="3" height="10" rx="1.5"/>`;
    case 'wizard':
      return `<g transform="translate(0 -4)"><path fill="#5B3FE0" d="M35 47c8-3 16-4 25-4s17 1 25 4L65 14c-2-3-6-3-7 0z"/>
<path fill="#FFD166" d="M58 22l1.5 3 3.3.4-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.4z"/>
<circle fill="#FFD166" cx="69" cy="34" r="1.5"/><circle fill="#FFD166" cx="52" cy="38" r="1.2"/>
<ellipse fill="#4529B8" cx="60" cy="47" rx="31" ry="5"/></g>`;
    default:
      return '';
  }
}

function glasses(id: string): string {
  switch (id) {
    case 'round':
      return `<g fill="#FFFFFF" fill-opacity=".12" stroke="#2D3047" stroke-width="2.2">
<circle cx="49" cy="61" r="7.5"/><circle cx="71" cy="61" r="7.5"/></g>
<path stroke="#2D3047" stroke-width="2.2" fill="none" d="M56.5 60.5c2-2 5-2 7 0M41.5 60l-5-2M78.5 60l5-2"/>`;
    case 'square':
      return `<g fill="#FFFFFF" fill-opacity=".12" stroke="#2D3047" stroke-width="2.4" stroke-linejoin="round">
<rect x="40" y="54.5" width="17" height="13" rx="3.5"/><rect x="63" y="54.5" width="17" height="13" rx="3.5"/></g>
<path stroke="#2D3047" stroke-width="2.4" fill="none" d="M57 59.5c2-1.5 4-1.5 6 0M40 58l-4-1.5M80 58l4-1.5"/>`;
    case 'sun':
      return `<path fill="#1D2030" d="M38 55h20c0 8-3 13-10 13s-10-5-10-13zM62 55h20c0 8-3 13-10 13s-10-5-10-13z"/>
<path stroke="#1D2030" stroke-width="2.4" fill="none" d="M57 56.5c2-1.5 4-1.5 6 0M38 56l-3-1M82 56l3-1"/>
<path fill="#FFFFFF" opacity=".3" d="M42 57h6l-4 6c-2-2-2-4-2-6zM66 57h6l-4 6c-2-2-2-4-2-6z"/>`;
    case 'heart':
      return `<g fill="#FF5F8F" stroke="#D93A6C" stroke-width="1.5" stroke-linejoin="round">
<path d="M49 69c-6-4-10-8-10-12 0-3 2-5 5-5 2 0 4 1 5 3 1-2 3-3 5-3 3 0 5 2 5 5 0 4-4 8-10 12z"/>
<path d="M71 69c-6-4-10-8-10-12 0-3 2-5 5-5 2 0 4 1 5 3 1-2 3-3 5-3 3 0 5 2 5 5 0 4-4 8-10 12z"/></g>
<path stroke="#D93A6C" stroke-width="2" fill="none" d="M58 58c1-1 3-1 4 0"/>
<path fill="#FFFFFF" opacity=".45" d="M43 55c1-1 3-1 4 0-1 1-3 2-4 0zM65 55c1-1 3-1 4 0-1 1-3 2-4 0z"/>`;
    default:
      return '';
  }
}

/** SVG markup of an avatar (square, background clipped to a circle). */
export function avatarSvg(c: AvatarConfig, uid = 'a'): string {
  const skin = pick(SKINS, c.skin, DEFAULT_AVATAR.skin);
  const hairFill = pick(HAIR_COLORS, c.hairColor, DEFAULT_AVATAR.hairColor).fill;
  const eye = pick(EYE_COLORS, c.eyes, DEFAULT_AVATAR.eyes).fill;
  const bg = pick(BACKGROUNDS, c.bg, DEFAULT_AVATAR.bg);
  const f = c.body === 'f';
  const h = hair(c.hair, c.body, hairFill);
  const brow = darker(hairFill, c.hairColor === 'grey' || c.hairColor === 'blond' ? 0.35 : 0.1);
  const stops = bg.stops.map((s, i) => `<stop offset="${i / (bg.stops.length - 1)}" stop-color="${s}"/>`).join('');
  const stars = bg.stars
    ? [[22, 26, 1.2], [92, 20, 1.6], [100, 52, 1], [16, 62, 1.4], [30, 90, 1], [96, 86, 1.2], [76, 12, 1]]
        .map(([x, y, r]) => `<circle fill="#FFFFFF" opacity=".85" cx="${x}" cy="${y}" r="${r}"/>`)
        .join('')
    : '';
  // A rounder face and longer lashes for "f"; a slightly squarer jaw for "m".
  const face = f
    ? 'M60 33c14 0 23 10 23 25 0 17-10 29-23 29S37 75 37 58c0-15 9-25 23-25z'
    : 'M60 32c15 0 24 10 24 25v4c0 15-10 26-24 26S36 76 36 61v-4c0-15 9-25 24-25z';
  const lashes = f
    ? `<path stroke="#2A2222" stroke-width="1.7" stroke-linecap="round" fill="none" d="M44.3 60c1.4-3.6 4-5.2 6.6-4.8 1.6.3 2.8 1.3 3.5 2.6M44.3 60l-2.2-1.9M75.7 60c-1.4-3.6-4-5.2-6.6-4.8-1.6.3-2.8 1.3-3.5 2.6M75.7 60l2.2-1.9"/>`
    : '';
  const lips = f ? '#D9616B' : darker(skin.shade, 0.35);

  // Zoomed on the face: the drawing is 120 units wide, the visible circle 104.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="8 12 104 104">
<defs>
<linearGradient id="bg-${uid}" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
<clipPath id="clip-${uid}"><circle cx="60" cy="64" r="52"/></clipPath>
</defs>
<g clip-path="url(#clip-${uid})">
<rect width="120" height="130" fill="url(#bg-${uid})"/>${stars}
${h.back}
<path fill="${bg.shirt}" d="M16 124c0-20 17-31 44-31s44 11 44 31z"/>
<path fill="${darker(bg.shirt, 0.12)}" d="M47 95c4 6 9 9 13 9s9-3 13-9c-4-1-8-2-13-2s-9 1-13 2z"/>
<path fill="${skin.shade}" d="M51 78h18v15c-3 5-15 5-18 0z"/>
<ellipse fill="${skin.fill}" cx="${f ? 37.5 : 36.5}" cy="62" rx="5" ry="6.5"/>
<ellipse fill="${skin.fill}" cx="${f ? 82.5 : 83.5}" cy="62" rx="5" ry="6.5"/>
<ellipse fill="${skin.shade}" cx="${f ? 37.5 : 36.5}" cy="62.5" rx="2.2" ry="3.5"/>
<ellipse fill="${skin.shade}" cx="${f ? 82.5 : 83.5}" cy="62.5" rx="2.2" ry="3.5"/>
<path fill="${skin.fill}" d="${face}"/>
<path fill="${skin.shade}" opacity=".35" d="M60 87c-9 0-16-5-20-13 6 5 12 7 20 7s14-2 20-7c-4 8-11 13-20 13z"/>
<ellipse fill="#FF7A7A" opacity=".22" cx="45" cy="70" rx="5" ry="3"/>
<ellipse fill="#FF7A7A" opacity=".22" cx="75" cy="70" rx="5" ry="3"/>
<ellipse fill="#FFFFFF" cx="49" cy="61" rx="4.6" ry="5"/>
<ellipse fill="#FFFFFF" cx="71" cy="61" rx="4.6" ry="5"/>
<circle fill="${eye}" cx="49.4" cy="61.6" r="3.3"/>
<circle fill="${eye}" cx="70.6" cy="61.6" r="3.3"/>
<circle fill="#1B1716" cx="49.5" cy="61.8" r="1.6"/>
<circle fill="#1B1716" cx="70.5" cy="61.8" r="1.6"/>
<circle fill="#FFFFFF" cx="50.6" cy="60.4" r="1"/>
<circle fill="#FFFFFF" cx="71.7" cy="60.4" r="1"/>
${lashes}
<path stroke="${brow}" stroke-width="${f ? 2 : 2.6}" stroke-linecap="round" fill="none" d="M43.5 ${f ? 52.5 : 53}c3-2 7-2.5 10-1.2M76.5 ${f ? 52.5 : 53}c-3-2-7-2.5-10-1.2"/>
<path stroke="${skin.shade}" stroke-width="1.8" stroke-linecap="round" fill="none" d="M58.3 68.2c1.1 1.1 2.3 1.1 3.4 0"/>
<path fill="${lips}" d="M53.5 74c4 3.6 9 3.6 13 0 .6-.5 0 2-1.5 3.3-3.2 2.6-6.8 2.6-10 0-1.5-1.3-2.1-3.8-1.5-3.3z"/>
${h.front}
${glasses(c.glasses)}
${hat(c.hat, c.body)}
</g>
</svg>`;
}
