import type { TierList } from '../store/types';
import { parsePayload, toPayload, type SharedList } from './share';

/**
 * Tiercraft's Supabase project (tables and functions: see supabase/migrations).
 * The publishable key is meant to ship in the app: it can only call what the
 * database policies allow.
 */
const SUPABASE_URL = 'https://mefhdtpyhtvplpfleyhi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3nkx7nvNVBbfy4Q_sqEf3w_WXELIyYP';
const TIMEOUT_MS = 10000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      signal: controller.signal,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!res.ok) {
      // Database errors carry their message, e.g. "player not found".
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? `Supabase ${res.status}`);
    }
    // Functions returning nothing answer with an empty body.
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  } finally {
    clearTimeout(timer);
  }
}

const rpc = <T>(name: string, args: object) => request<T>(`rpc/${name}`, { method: 'POST', body: JSON.stringify(args) });

/** Stores `list` online and returns its 6-character share code. */
export function createShareCode(list: TierList): Promise<string> {
  return rpc<string>('share_list', { payload: toPayload(list) });
}

/** Tier list stored under `code`, or null if the code doesn't exist. */
export async function fetchSharedList(code: string): Promise<SharedList | null> {
  const payload = await rpc<unknown>('get_shared_list', { code });
  return payload ? parsePayload(payload, code) : null;
}

/** Sends the validated ranking of a daily tier list (ranks[i]: 0 = S … 4 = D for item i). */
export function submitDailyVote(day: string, deviceId: string, ranks: number[]): Promise<boolean> {
  return rpc<boolean>('submit_daily_vote', { day, device_id: deviceId, ranks });
}

/** Records or replaces this device's ranking of a popular tier list. */
export function submitListVote(listKey: string, deviceId: string, ranks: number[]): Promise<void> {
  return rpc<void>('submit_list_vote', { list_key: listKey, device_id: deviceId, ranks });
}

export function fetchListResults(listKey: string): Promise<DailyResults> {
  return rpc<DailyResults>('get_list_results', { list_key: listKey });
}

/** Adds or removes this device's favourite on a popular tier list. */
export function setTemplateFavorite(templateKey: string, deviceId: string, favorite: boolean): Promise<void> {
  return rpc<void>('set_template_favorite', { template_key: templateKey, device_id: deviceId, favorite });
}

export type TemplateStats = Record<string, { completions: number; favorites: number }>;

/** Completed rankings and favourites of the popular tier lists, by template key. */
export async function fetchTemplateStats(): Promise<TemplateStats> {
  const rows = await rpc<{ template_key: string; completions: number; favorites: number }[]>('get_template_stats_v2', {});
  return Object.fromEntries(
    (rows ?? []).map((r) => [r.template_key, { completions: Number(r.completions), favorites: Number(r.favorites) }]),
  );
}

export type DailyResults = {
  votes: number;
  /** Per published item, in order: average tier (0 = S … 4 = D) and votes per tier. */
  items: { average: number; counts: number[] }[];
};

export function fetchDailyResults(day: string): Promise<DailyResults> {
  return rpc<DailyResults>('get_daily_results', { day });
}

export type RemoteTemplate = { key: string; title: string; emoji: string; items: string[]; tiers?: string[] };

export type DailyList = { day: string; title: string; emoji: string; description?: string; items: string[] };

type TemplateRow = { key: string; title: string; emoji: string; items: string[]; tiers: string[] | null };
type DailyRow = Omit<TemplateRow, 'key' | 'tiers'> & { day: string; description: string | null };

/** Templates published from the Supabase dashboard. */
export async function fetchTemplates(): Promise<RemoteTemplate[]> {
  const rows = await request<TemplateRow[]>('templates?select=key,title,emoji,items,tiers&order=sort.asc,created_at.asc');
  return rows.map((r) => ({ key: r.key, title: r.title, emoji: r.emoji, items: r.items, tiers: r.tiers ?? undefined }));
}

/** Local calendar date, e.g. "2026-10-13". */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Most recent daily tier list up to today (local date), if any. */
export async function fetchDaily(day = today()): Promise<DailyList | null> {
  const rows = await request<DailyRow[]>(`daily_lists?select=day,title,emoji,description,items&day=lte.${day}&order=day.desc&limit=1`);
  const r = rows[0];
  if (!r) return null;
  return { day: r.day, title: r.title, emoji: r.emoji, description: r.description ?? undefined, items: r.items };
}

/** Daily tier lists of the days before `before` (YYYY-MM-DD), newest first. */
export async function fetchPastDailies(before = today()): Promise<DailyList[]> {
  const rows = await request<DailyRow[]>(`daily_lists?select=day,title,emoji,description,items&day=lt.${before}&order=day.desc&limit=366`);
  return rows.map((r) => ({ day: r.day, title: r.title, emoji: r.emoji, description: r.description ?? undefined, items: r.items }));
}

/**
 * Public part of a player profile. `completed`: tier lists they ranked (popular and daily).
 * `hidden`: masked after several reports.
 */
export type PublicProfile = { id: string; pseudo: string; tag: number; avatar: string; completed: number; hidden?: boolean };

export function createProfile(deviceId: string, secret: string, pseudo: string, avatar: string): Promise<PublicProfile> {
  return rpc<PublicProfile>('create_profile', { device_id: deviceId, secret, pseudo, avatar });
}

export function updateProfile(secret: string, pseudo: string, avatar: string): Promise<PublicProfile> {
  return rpc<PublicProfile>('update_profile', { secret, pseudo, avatar });
}

export type Friends = { me: PublicProfile; friends: PublicProfile[]; incoming: PublicProfile[]; outgoing: PublicProfile[] };

export function fetchFriends(secret: string): Promise<Friends> {
  return rpc<Friends>('get_friends', { secret });
}

/** Asks "pseudo#tag" for friendship: pending, accepted (they had asked too) or already_friends. */
export function sendFriendRequest(secret: string, pseudo: string, tag: number): Promise<'pending' | 'accepted' | 'already_friends'> {
  return rpc('send_friend_request', { secret, pseudo, tag });
}

export function respondFriendRequest(secret: string, other: string, accept: boolean): Promise<void> {
  return rpc<void>('respond_friend_request', { secret, other, accept });
}

export function removeFriend(secret: string, other: string): Promise<void> {
  return rpc<void>('remove_friend', { secret, other });
}

/** Reports a player's pseudo or avatar; also ends the link with them. */
export function reportPlayer(secret: string, other: string, reason: 'pseudo' | 'avatar'): Promise<void> {
  return rpc<void>('report_player', { secret, other, reason });
}

/** A friend's validated ranking: key is a popular list key or "daily:YYYY-MM-DD". */
export type FriendVote = { key: string; ranks: number[]; at: string };

export function fetchFriendLists(secret: string, friend: string): Promise<{ profile: PublicProfile; votes: FriendVote[] }> {
  return rpc('get_friend_lists', { secret, friend });
}
