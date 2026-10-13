import * as Clipboard from 'expo-clipboard';
import { Alert, Platform, Share } from 'react-native';

import type { TierList } from '../store/types';

/**
 * A tier list as sent to someone else: no ids, no pictures (they only exist on
 * the sender's phone), cards keep their tier and order.
 */
export type SharedList = {
  /** The encoded form, used to recognise a link that was already imported. */
  code: string;
  title: string;
  tiers: { label: string; color: string }[];
  /** `tier` is the index in `tiers`, or -1 when the card is not ranked. */
  cards: { label: string; color: string; tier: number }[];
};

const VERSION = 1;
/**
 * Website serving the share pages (share-site/ deployed on Vercel). iOS opens
 * https://SHARE_HOST/import?d=… links straight in the app thanks to the
 * associated domain declared in app.json; without the app, the page sends
 * people to the App Store.
 */
export const SHARE_HOST = 'tiercraft.vercel.app';
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

type Payload = { v: number; t: string; r: [string, string][]; c: [string, string, number][] };

/** JSON form of `list` shared through links and codes. */
export function toPayload(list: TierList): Payload {
  const tierIndex = new Map(list.tiers.map((t, i) => [t.id, i]));
  const ordered: [string, number][] = [
    ...list.tiers.flatMap((t) => (list.placement[t.id] ?? []).map((id): [string, number] => [id, tierIndex.get(t.id)!])),
    ...list.pool.map((id): [string, number] => [id, -1]),
  ];
  return {
    v: VERSION,
    t: list.title,
    r: list.tiers.map((t) => [t.label, t.color]),
    c: ordered.filter(([id]) => list.cards[id]).map(([id, tier]) => [list.cards[id].label, list.cards[id].color, tier]),
  };
}

/** Compact, URL-safe string describing `list`, used by offline links. */
export function encodeList(list: TierList): string {
  return toBase64Url(utf8Encode(JSON.stringify(toPayload(list))));
}

/** Offline link: carries the whole tier list, works without the share service. */
export function offlineLink(list: TierList): string {
  return `https://${SHARE_HOST}/import?d=${encodeList(list)}`;
}

export function codeLink(code: string): string {
  return `https://${SHARE_HOST}/s/${code}`;
}

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Validates a payload received from a link or the share service. */
export function parsePayload(data: unknown, code: string): SharedList | null {
  const d = data as Partial<Record<'v' | 't' | 'r' | 'c', unknown>> | null;
  if (!d || d.v !== VERSION || !Array.isArray(d.r) || !Array.isArray(d.c)) return null;
  const tiers = (d.r as unknown[])
    .slice(0, MAX_TIERS)
    .filter(Array.isArray)
    .map(([label, color]) => ({ label: text(label, 30) || '?', color: isHex(color) ? color : '#7F7FFF' }));
  if (tiers.length === 0) return null;
  const cards = (d.c as unknown[])
    .slice(0, MAX_CARDS)
    .filter(Array.isArray)
    .map(([label, color, tier]) => ({
      label: text(label, 40),
      color: isHex(color) ? color : '#2B2F3A',
      tier: typeof tier === 'number' && Number.isInteger(tier) && tier >= 0 && tier < tiers.length ? tier : -1,
    }));
  return { code, title: text(d.t, 60) || 'Tier list partagée', tiers, cards };
}

/** Normalises a typed share code ("k7f-3qx" → "K7F3QX"), or null if it isn't one. */
export function normalizeCode(input: string): string | null {
  const fromLink = input.match(/\/s\/([A-Za-z2-9]{6})\b/);
  const raw = fromLink?.[1] ?? input.replace(/[\s-]/g, '');
  return /^[A-HJ-NP-Za-hj-np-z2-9]{6}$/.test(raw) ? raw.toUpperCase() : null;
}

/**
 * Reads a tier list carried by an offline link, or a whole pasted message
 * containing one. Returns null when nothing valid is found.
 */
export function decodeShared(input: string): SharedList | null {
  const fromLink = input.match(/[?&]d=([A-Za-z0-9_-]+)/);
  const code = fromLink?.[1] ?? input.trim().match(/^[A-Za-z0-9_-]{8,}$/)?.[0];
  if (!code) return null;
  const bytes = fromBase64Url(code);
  if (!bytes) return null;
  try {
    return parsePayload(JSON.parse(utf8Decode(bytes)), code);
  } catch {
    return null;
  }
}

/** Opens the system share sheet with `url` and a short intro. */
export async function shareUrl(title: string, intro: string, url: string): Promise<void> {
  try {
    // iOS shares the URL as a rich link next to the text; Android only takes a message.
    await Share.share(Platform.OS === 'ios' ? { message: intro, url } : { message: `${intro}\n${url}` }, { dialogTitle: title });
  } catch {
    // The user closed the share sheet or sharing is unavailable: nothing to do.
  }
}

export async function copyText(value: string, confirmation: string): Promise<void> {
  try {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copié', confirmation);
  } catch {
    Alert.alert('Copie impossible', 'Le texte n’a pas pu être copié.');
  }
}
