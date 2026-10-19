import type { TierList } from '../store/types';
import type { Settings } from '../store/useTierStore';
import { decodeShared, normalizeCode } from './share';

/** Days after the first launch during which a new player is asked whether a friend invited them. */
export const INVITE_DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

/** What to open from a pasted invitation: a short code, or a whole offline link. */
export type Invite = { c: string } | { d: string };

/**
 * The invitation in text the player pasted: what the share page copied before
 * sending them to the App Store ("Tiercraft K7M2PQ"), a short or offline link
 * (alone or inside a message), or the code alone.
 */
export function inviteFromText(text: string): Invite | null {
  const offline = decodeShared(text);
  if (offline) return { d: offline.code };
  const code = normalizeCode(text.trim());
  if (code) return { c: code };
  // The page's marker: a loose 6-letter word elsewhere in the text could be anything.
  const marked = text.match(/\btiercraft\b[\s:]*([a-z0-9]{3}[\s-]?[a-z0-9]{3})\b/i);
  const fromMarker = marked && normalizeCode(marked[1]);
  return fromMarker ? { c: fromMarker } : null;
}

/** A list added from a friend's code or link (not the daily list, nor one sent inside the app). */
const fromShare = (list: TierList) => Boolean(list.importedFrom) && !/^(daily|mail):/.test(list.importedFrom!);

/**
 * The invitation card is for players who just installed the app (likely from a
 * friend's link), once the welcome screens and the region question are behind
 * them: one window at a time.
 */
export function shouldOfferInvite(settings: Settings, lists: Record<string, TierList>, now: number): boolean {
  if (!settings.onboarded || !settings.regionAsked || settings.inviteAsked) return false;
  // No arrival date: a save from before it was kept, so not a new player.
  if (settings.joinedAt === undefined || now - settings.joinedAt >= INVITE_DAYS * DAY) return false;
  return !Object.values(lists).some(fromShare);
}

/**
 * The arrival date, kept the first time the app opens on the welcome screens.
 * Players already welcomed when this shipped never get one: they aren't new.
 */
export function joinStamp(settings: Settings, now: number): Pick<Settings, 'joinedAt'> | null {
  return !settings.onboarded && settings.joinedAt === undefined ? { joinedAt: now } : null;
}
