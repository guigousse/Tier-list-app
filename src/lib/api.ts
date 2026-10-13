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
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    return (await res.json()) as T;
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

export type RemoteTemplate = { key: string; title: string; emoji: string; items: string[]; tiers?: string[] };

export type DailyList = { day: string; title: string; emoji: string; description?: string; items: string[]; tiers?: string[] };

type TemplateRow = { key: string; title: string; emoji: string; items: string[]; tiers: string[] | null };
type DailyRow = TemplateRow & { day: string; description: string | null };

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
  const rows = await request<DailyRow[]>(`daily_lists?select=day,title,emoji,description,items,tiers&day=lte.${day}&order=day.desc&limit=1`);
  const r = rows[0];
  if (!r) return null;
  return { day: r.day, title: r.title, emoji: r.emoji, description: r.description ?? undefined, items: r.items, tiers: r.tiers ?? undefined };
}
