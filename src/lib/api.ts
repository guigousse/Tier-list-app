import type { TierList } from '../store/types';
import type { TierTone } from './aiGenerate';
import { parsePayload, toPayload, type SharedList } from './share';
import type { Discovery } from './discover';
import { dailyDay } from './dailyClock';
import type { Language } from './i18n';
import type { RemoteTranslations } from './i18n/content';

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

/** AI generation (edge function `ai-generate`): the AI key stays on the server. */
async function aiCall<T>(body: object, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-generate`, {
      method: 'POST',
      signal: controller.signal,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `ai ${res.status}`);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export type AiCard = { label: string; emoji: string; concept: string };

/** A one-use challenge for App Attest (the welcome bonus). */
export function aiChallenge(deviceId: string): Promise<{ challenge: string }> {
  return aiCall({ action: 'challenge', deviceId }, 15_000);
}

export type Attestation = { keyId: string; attestation: string; challenge: string };

/**
 * Opens this install's credits wallet (or finds it again) and returns its balance; with
 * an App Attest attestation, the welcome bonus is added once.
 */
export function aiWallet(deviceId: string, wallet: string, attest?: Attestation): Promise<{ balance: number; attested: boolean }> {
  return aiCall({ action: 'wallet', deviceId, wallet, ...attest }, 20_000);
}

/**
 * Pays the credits of the lists path reached by this device (5 every 25 lists, counted
 * by the server from its votes) into the wallet; returns the balance.
 */
export function claimListCredits(deviceId: string, wallet: string): Promise<number> {
  return rpc<number>('claim_list_credits', { wallet, device_id: deviceId });
}

/**
 * What the server knows of this device's progress, to get it back after a reinstall:
 * lists completed (its votes), days of the daily tier list played, VS chosen.
 */
export function restoreProgressApi(deviceId: string): Promise<{ completed: number; days: string[]; choices: Record<string, string> }> {
  return rpc('restore_progress', { device_id: deviceId });
}

/** Keeps a VS choice on the server (once: the first choice stays). */
export function saveBadgeChoiceApi(deviceId: string, fork: string, badge: string): Promise<void> {
  return rpc('save_badge_choice', { device_id: deviceId, fork, badge });
}

/**
 * Credits an energy pack bought in the App Store: `transaction` is StoreKit's signed
 * transaction, checked by the server against Apple's certificates. `credited` is false
 * when it had already been credited.
 */
export function aiPurchase(deviceId: string, wallet: string, transaction: string): Promise<{ balance: number; credited: boolean; credits: number }> {
  return aiCall({ action: 'purchase', deviceId, wallet, transaction }, 30_000);
}

/** Card names for a theme (without the cards already in the list), in `lang`, paid from `wallet`. */
export function aiWords(
  deviceId: string,
  wallet: string,
  theme: string,
  count: number,
  existing: string[],
  lang: Language,
): Promise<{ cards: AiCard[]; balance: number }> {
  return aiCall({ action: 'words', deviceId, wallet, theme, count, existing, lang }, 90_000);
}

/** New tier names for the theme, in `tone`, best tier first, as many as `current`; `cards`: a few, for context. */
export function aiTiers(
  deviceId: string,
  wallet: string,
  theme: string,
  current: string[],
  tone: TierTone,
  cards: string[],
  lang: Language,
): Promise<{ labels: string[]; balance: number }> {
  return aiCall({ action: 'tiers', deviceId, wallet, theme, current, tone, cards, lang }, 60_000);
}

/**
 * The icons of a list's cards, all at once: from the shared library, the others drawn
 * together on one sheet (about 30 s). `url` is null for an icon that came out empty.
 */
export function aiIcons(
  deviceId: string,
  wallet: string,
  cards: { label: string; concept: string; redraw?: boolean }[],
  theme: string,
): Promise<{ icons: { concept: string; url: string | null }[]; balance: number }> {
  return aiCall({ action: 'icons', deviceId, wallet, cards, theme }, 240_000);
}

/** Hidden theme tags and trend scores of the popular tier lists. */
export async function fetchDiscovery(): Promise<Discovery> {
  const d = await rpc<Partial<Discovery> | null>('get_discovery', {});
  return { tags: d?.tags ?? {}, trends: d?.trends ?? {} };
}

/** A popular tier list was opened: counts in the trends. */
export function recordTemplateView(templateKey: string, deviceId: string): Promise<void> {
  return rpc<void>('record_template_view', { template_key: templateKey, device_id: deviceId });
}

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

export type RemoteTemplate = {
  key: string;
  title: string;
  emoji: string;
  items: string[];
  tiers?: string[];
  concepts?: string[];
  theme?: string;
  /** Countries where the list is put forward (ISO codes); everywhere when missing. */
  regions?: string[];
  /** The only countries whose players may vote on it (a national election…); everyone when missing. */
  voteRegions?: string[];
};

export type DailyList = {
  day: string;
  title: string;
  emoji: string;
  description?: string;
  items: string[];
  regions?: string[];
  voteRegions?: string[];
};

type TemplateRow = {
  key: string;
  title: string;
  emoji: string;
  items: string[];
  tiers: string[] | null;
  concepts: string[] | null;
  theme: string | null;
  regions: string[] | null;
  vote_regions: string[] | null;
};
type DailyRow = Omit<TemplateRow, 'key' | 'tiers' | 'concepts' | 'theme'> & { day: string; description: string | null };

const DAILY_COLUMNS = 'day,title,emoji,description,items,regions,vote_regions';
const regionsOf = (r: { regions: string[] | null; vote_regions: string[] | null }) => ({
  ...(r.regions ? { regions: r.regions } : {}),
  ...(r.vote_regions ? { voteRegions: r.vote_regions } : {}),
});
const dailyOf = (r: DailyRow): DailyList => ({
  day: r.day,
  title: r.title,
  emoji: r.emoji,
  description: r.description ?? undefined,
  items: r.items,
  ...regionsOf(r),
});

/** Templates published from the Supabase dashboard. */
export async function fetchTemplates(): Promise<RemoteTemplate[]> {
  const rows = await request<TemplateRow[]>(
    'templates?select=key,title,emoji,items,tiers,concepts,theme,regions,vote_regions&order=sort.asc,created_at.asc',
  );
  return rows.map((r) => ({
    key: r.key,
    title: r.title,
    emoji: r.emoji,
    items: r.items,
    tiers: r.tiers ?? undefined,
    concepts: r.concepts ?? undefined,
    theme: r.theme ?? undefined,
    ...regionsOf(r),
  }));
}

/** Translations of the online templates and daily lists in `lang` (never French: the source). */
export async function fetchTranslations(lang: Exclude<Language, 'fr'>): Promise<RemoteTranslations> {
  const rows = await request<{ kind: 'template' | 'daily'; key: string; title: string | null; description: string | null; items: string[] | null; tiers: string[] | null }[]>(
    `content_translations?select=kind,key,title,description,items,tiers&lang=eq.${lang}&kind=in.(template,daily)`,
  );
  const result: RemoteTranslations = { lang, template: {}, daily: {} };
  for (const r of rows) {
    result[r.kind][r.key] = {
      ...(r.title ? { title: r.title } : {}),
      ...(r.description ? { description: r.description } : {}),
      ...(r.items ? { items: r.items } : {}),
      ...(r.tiers ? { tiers: r.tiers } : {}),
    };
  }
  return result;
}

/** Each public list's favourite card (template key → index of the card most often ranked S). */
export async function fetchListTops(): Promise<Record<string, number>> {
  const rows = await rpc<{ template_key: string; top: number }[]>('get_list_tops', {});
  return Object.fromEntries((rows ?? []).map((r) => [r.template_key, Number(r.top)]));
}

/** Images of the shared AI library already drawn for these concepts (free: nothing is drawn). */
export async function fetchCardIcons(concepts: string[]): Promise<Record<string, string>> {
  if (!concepts.length) return {};
  const rows = await rpc<{ concept: string; image: string }[]>('get_card_icons', { concepts });
  return Object.fromEntries((rows ?? []).map((r) => [r.concept, r.image]));
}

/**
 * Library pictures redrawn as stickers: for each of these old picture URLs that has a
 * replacement, the new one (supabase/migrations/*_sticker_icons.sql).
 */
export async function fetchIconReplacements(images: string[]): Promise<Record<string, string>> {
  if (!images.length) return {};
  const rows = await rpc<{ image: string; replaced_by: string }[]>('get_icon_replacements', { images });
  return Object.fromEntries((rows ?? []).map((r) => [r.image, r.replaced_by]));
}

/** Local calendar date, e.g. "2026-10-13". */
/** Day of the daily tier list on show: it comes out at 12:30 Paris time (lib/dailyClock.ts). */
export function today(): string {
  return dailyDay();
}

/** Most recent daily tier list up to today (the daily tier list's day), if any. */
export async function fetchDaily(day = today()): Promise<DailyList | null> {
  const rows = await request<DailyRow[]>(`daily_lists?select=${DAILY_COLUMNS}&day=lte.${day}&order=day.desc&limit=1`);
  return rows[0] ? dailyOf(rows[0]) : null;
}

/** Daily tier lists of the days before `before` (YYYY-MM-DD), newest first. */
export async function fetchPastDailies(before = today()): Promise<DailyList[]> {
  const rows = await request<DailyRow[]>(`daily_lists?select=${DAILY_COLUMNS}&day=lt.${before}&order=day.desc&limit=366`);
  return rows.map(dailyOf);
}

/**
 * Public part of a player profile. `completed`: tier lists they ranked (popular and daily).
 * `hidden`: masked after several reports.
 */
export type PublicProfile = {
  id: string;
  pseudo: string;
  tag: number;
  avatar: string;
  completed: number;
  hidden?: boolean;
  /** Badges the player shows on their profile (absent before badges existed). */
  badges?: string[];
};

export function createProfile(deviceId: string, secret: string, pseudo: string, avatar: string): Promise<PublicProfile> {
  return rpc<PublicProfile>('create_profile', { device_id: deviceId, secret, pseudo, avatar });
}

export function updateProfile(secret: string, pseudo: string, avatar: string): Promise<PublicProfile> {
  return rpc<PublicProfile>('update_profile', { secret, pseudo, avatar });
}

/** The app's language on the player's profile: their notifications are written in it. */
export function setLanguageApi(secret: string, language: Language): Promise<void> {
  return rpc<void>('set_language', { secret, language });
}

/** The badges shown on the player's profile, up to 3. */
export function setBadges(secret: string, badges: string[]): Promise<void> {
  return rpc<void>('set_badges', { secret, badges });
}

export type Friends = {
  me: PublicProfile;
  friends: PublicProfile[];
  incoming: PublicProfile[];
  outgoing: PublicProfile[];
  /** Players this player blocked (absent before the server knew blocks). */
  blocked?: PublicProfile[];
};

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

/** Ends the link with a player; neither can send the other a request until unblocked. */
export function blockPlayer(secret: string, other: string): Promise<void> {
  return rpc<void>('block_player', { secret, other });
}

export function unblockPlayer(secret: string, other: string): Promise<void> {
  return rpc<void>('unblock_player', { secret, other });
}

/** Deletes the profile, its friends and blocks, and the votes made with its device id. */
export function deleteProfile(secret: string): Promise<void> {
  return rpc<void>('delete_profile', { secret });
}

/** Reports a player's pseudo or avatar; also blocks them. */
export function reportPlayer(secret: string, other: string, reason: 'pseudo' | 'avatar'): Promise<void> {
  return rpc<void>('report_player', { secret, other, reason });
}

/** A friend's validated ranking: key is a popular list key or "daily:YYYY-MM-DD". */
export type FriendVote = { key: string; ranks: number[]; at: string };

export function fetchFriendLists(secret: string, friend: string): Promise<{ profile: PublicProfile; votes: FriendVote[] }> {
  return rpc('get_friend_lists', { secret, friend });
}

// ——— Tier lists sent between friends ———

/** A tier list sent to or by the player, as the server returns it (payload not checked yet). */
type MailRow = {
  id: string;
  payload: unknown;
  status: 'sent' | 'ranked';
  sent_at: string;
  answered_at: string | null;
  /** Sender's tier per card (-1 unranked); for a received list, only once it's ranked. */
  sender_ranks: number[] | null;
  recipient_ranks: number[] | null;
  /** Answered at once with the friend's earlier ranking of the same list. */
  auto: boolean;
};
export type InboxRow = MailRow & { from: PublicProfile };
export type OutboxRow = MailRow & { to: PublicProfile; seen: boolean };

/** Sends `list` (without photos, its ranking kept apart) to friends; returns how many got it. */
export function sendList(secret: string, recipients: string[], list: TierList): Promise<number> {
  return rpc<number>('send_list', { secret, recipients, payload: toPayload(list) });
}

/** Friends the player already sent the same list to, and where it stands. */
export function mailSentTo(secret: string, list: TierList): Promise<{ friend: string; mail: string; status: 'sent' | 'ranked' }[]> {
  return rpc('mail_sent_to', { secret, payload: toPayload(list) });
}

/** Ranks a received list again: it's back to rank, and the friend waits for the new ranking. */
export function rerankMail(secret: string, mail: string): Promise<void> {
  return rpc<void>('rerank_mail', { secret, mail });
}

export function fetchMail(secret: string): Promise<{ inbox: InboxRow[]; outbox: OutboxRow[] }> {
  return rpc('get_mail', { secret });
}

/** The player's ranking of a received list: tier index per card, in the list's order. */
export function answerMail(secret: string, mail: string, ranks: number[]): Promise<void> {
  return rpc<void>('answer_mail', { secret, mail, ranks });
}

/** The player's current ranking of a list they sent (tier index per card, -1 unranked). */
export function setSenderRanks(secret: string, mail: string, ranks: number[]): Promise<void> {
  return rpc<void>('set_sender_ranks', { secret, mail, ranks });
}

export function ignoreMail(secret: string, mail: string): Promise<void> {
  return rpc<void>('ignore_mail', { secret, mail });
}

/** Reports a received list: its sender is reported and blocked. */
export function reportMail(secret: string, mail: string): Promise<void> {
  return rpc<void>('report_mail', { secret, mail });
}

export function markMailSeen(secret: string, mail: string): Promise<void> {
  return rpc<void>('mark_mail_seen', { secret, mail });
}

/** Registers this install's Expo push token on the profile (null: no more notifications). */
export function setPushToken(secret: string, token: string | null): Promise<void> {
  return rpc<void>('set_push_token', { secret, token });
}

/** Friends who validated a list (popular list key, or "daily:YYYY-MM-DD"), with their ranking. */
export function fetchFriendsVotes(secret: string, key: string): Promise<(PublicProfile & { ranks: number[] })[]> {
  return rpc('get_friends_votes', { secret, key });
}
