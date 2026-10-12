import { Share } from 'react-native';

import type { TierList } from '../store/types';

/**
 * A tier list as sent to someone else: no ids, no pictures (they only exist on
 * the sender's phone), cards keep their tier and order.
 */
export type SharedList = {
  title: string;
  tiers: { label: string; color: string }[];
  /** `tier` is the index in `tiers`, or -1 when the card is not ranked. */
  cards: { label: string; color: string; tier: number }[];
};

const VERSION = 1;
const LINK_PREFIX = 'tiercraft://import?d=';
const MAX_TIERS = 30;
const MAX_CARDS = 300;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}

function fromBase64Url(text: string): number[] | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of text) {
    const v = B64.indexOf(ch);
    if (v === -1) return null;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

function utf8Encode(text: string): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return bytes;
}

function utf8Decode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    const extra = b >= 0xf0 ? 3 : b >= 0xe0 ? 2 : b >= 0xc0 ? 1 : 0;
    let c = extra === 0 ? b : b & (0x3f >> extra);
    for (let k = 1; k <= extra; k++) c = (c << 6) | ((bytes[i + k] ?? 0) & 63);
    out += String.fromCodePoint(c);
    i += extra + 1;
  }
  return out;
}

/** Compact, URL-safe code describing `list`. */
export function encodeList(list: TierList): string {
  const tierIndex = new Map(list.tiers.map((t, i) => [t.id, i]));
  const ordered: [string, number][] = [
    ...list.tiers.flatMap((t) => (list.placement[t.id] ?? []).map((id): [string, number] => [id, tierIndex.get(t.id)!])),
    ...list.pool.map((id): [string, number] => [id, -1]),
  ];
  const payload = {
    v: VERSION,
    t: list.title,
    r: list.tiers.map((t) => [t.label, t.color]),
    c: ordered.filter(([id]) => list.cards[id]).map(([id, tier]) => [list.cards[id].label, list.cards[id].color, tier]),
  };
  return toBase64Url(utf8Encode(JSON.stringify(payload)));
}

export function shareLink(list: TierList): string {
  return LINK_PREFIX + encodeList(list);
}

/** Opens the system share sheet with a message the recipient can open in Tiercraft. */
export async function sendList(list: TierList): Promise<void> {
  const link = shareLink(list);
  const message = [
    `Voici ma tier list « ${list.title} » sur Tiercraft :`,
    link,
    'Touchez le lien pour l’ouvrir. Sinon, copiez ce message puis dans Tiercraft : Mes tier lists → Importer.',
  ].join('\n\n');
  try {
    await Share.share({ message }, { dialogTitle: list.title });
  } catch {
    // The user closed the share sheet or sharing is unavailable: nothing to do.
  }
}

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/**
 * Reads a shared tier list from a code, a link, or a whole pasted message
 * containing the link. Returns null when nothing valid is found.
 */
export function decodeShared(input: string): SharedList | null {
  const fromLink = input.match(/[?&]d=([A-Za-z0-9_-]+)/);
  const code = fromLink?.[1] ?? input.trim().match(/^[A-Za-z0-9_-]{8,}$/)?.[0];
  if (!code) return null;
  const bytes = fromBase64Url(code);
  if (!bytes) return null;
  try {
    const data = JSON.parse(utf8Decode(bytes));
    if (data?.v !== VERSION || !Array.isArray(data.r) || !Array.isArray(data.c)) return null;
    const tiers = (data.r as unknown[][])
      .slice(0, MAX_TIERS)
      .filter(Array.isArray)
      .map(([label, color]) => ({ label: text(label, 30) || '?', color: isHex(color) ? color : '#7F7FFF' }));
    if (tiers.length === 0) return null;
    const cards = (data.c as unknown[][])
      .slice(0, MAX_CARDS)
      .filter(Array.isArray)
      .map(([label, color, tier]) => ({
        label: text(label, 40),
        color: isHex(color) ? color : '#2B2F3A',
        tier: typeof tier === 'number' && Number.isInteger(tier) && tier >= 0 && tier < tiers.length ? tier : -1,
      }));
    return { title: text(data.t, 60) || 'Tier list partagée', tiers, cards };
  } catch {
    return null;
  }
}
