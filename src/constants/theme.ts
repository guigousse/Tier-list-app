export const colors = {
  background: '#0F1115',
  surface: '#181B22',
  surfaceAlt: '#20242D',
  border: '#2C313C',
  text: '#F2F4F8',
  textMuted: '#9AA3B2',
  primary: '#7C5CFF',
  primaryText: '#FFFFFF',
  danger: '#FF5C6C',
  tray: '#14171D',
};

export const radius = { sm: 8, md: 12, lg: 18, xl: 24 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Classic tier list colours (S → F and beyond). */
export const TIER_COLORS = [
  '#FF7F7F',
  '#FFBF7F',
  '#FFDF7F',
  '#FFFF7F',
  '#BFFF7F',
  '#7FFF7F',
  '#7FFFFF',
  '#7FBFFF',
  '#7F7FFF',
  '#FF7FFF',
  '#BF7FBF',
];

/** Palette offered by the colour picker. */
export const PALETTE = [
  '#FF7F7F', '#FFBF7F', '#FFDF7F', '#FFFF7F', '#BFFF7F', '#7FFF7F',
  '#7FFFFF', '#7FBFFF', '#7F7FFF', '#FF7FFF', '#BF7FBF', '#FFFFFF',
  '#E53935', '#FB8C00', '#FDD835', '#43A047', '#00ACC1', '#1E88E5',
  '#5E35B1', '#D81B60', '#6D4C41', '#757575', '#37474F', '#1A1A1A',
];

export const CARD_COLORS = [
  '#2B2F3A', '#3D4454', '#5B3A7A', '#7A3A4E', '#7A5A2E', '#2E6A4F',
  '#2E5A7A', '#1E88E5', '#E53935', '#FB8C00', '#43A047', '#FFFFFF',
];

export const CARD_SIZES = { small: 56, medium: 72, large: 92 } as const;
export type CardSize = keyof typeof CARD_SIZES;

/** Returns black or white depending on which reads best on `hex`. */
export function readableTextColor(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return '#000000';
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111111' : '#FFFFFF';
}

export function isValidHex(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}
