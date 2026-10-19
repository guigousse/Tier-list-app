import { create } from 'zustand';

import type { TierList } from '../store/types';
import { useTierStore } from '../store/useTierStore';
import { collectReferrals, referralStatus } from './api';
import { openWallet, setBalance, useCredits } from './credits';

/** One newcomer who ranked the player's challenge (supabase/migrations/*_referral_pending.sql). */
export type Referral = { pseudo: string | null; lists: number; active: boolean; since: string };

export type ReferralStatus = { pending: number; count: number; cap: number; referrals: Referral[] };

/** The server stops paying after this many referrals. */
export const REFERRAL_CAP = 10;
/** What a referral pays: the challenge ranked, then 3 public lists ranked. */
export const REFERRAL_REWARD = { challenge: 5, active: 30 };

const count = (v: unknown, max = Infinity) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0);

/** The server's answer, read defensively: a bad field must not break the shop. */
export function parseReferralStatus(raw: unknown): ReferralStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const referrals = (Array.isArray(r.referrals) ? r.referrals : []).flatMap((x): Referral[] => {
    if (!x || typeof x !== 'object') return [];
    const o = x as Record<string, unknown>;
    return [
      {
        pseudo: typeof o.pseudo === 'string' && o.pseudo ? o.pseudo : null,
        lists: count(o.lists, 3),
        active: o.active === true,
        since: typeof o.since === 'string' ? o.since : '',
      },
    ];
  });
  return { pending: count(r.pending), count: count(r.count), cap: count(r.cap) || REFERRAL_CAP, referrals };
}

type T = (key: string, params?: Record<string, string | number>) => string;

export const referralName = (r: Referral, t: T) => r.pseudo ?? t('app.free.newPlayer');

export const referralStep = (r: Referral, t: T) => (r.active ? t('app.free.stepActive') : t('app.free.stepAccepted', { lists: r.lists }));

/**
 * Kept in memory only, not in the save: the pot grows on the server while the app is
 * closed, so a saved value would be stale at every launch, and it is fetched at launch
 * anyway. Nothing to migrate either.
 */
export const useReferrals = create<{
  status: ReferralStatus | null;
  /** The last refresh failed (or there is no wallet yet): what is shown may be old, or missing. */
  offline: boolean;
  /** When the server last answered, to keep under its rate limit. */
  fetchedAt: number;
  collecting: boolean;
  /** The last collect failed: the pot is still there. */
  collectFailed?: boolean;
  /** A pot just collected: the free energy page plays the bolts flying to the balance. */
  celebration: { from: number; to: number; key: number } | null;
}>(() => ({ status: null, offline: false, fetchedAt: 0, collecting: false, celebration: null }));

/** Whether energy waits to be collected: the badges on the energy pill and the shop's button. */
export const hasPot = (s: { status: ReferralStatus | null }) => (s.status?.pending ?? 0) > 0;

// The server allows 120 calls an hour per address: launch, returns to the app and shop
// visits share this gap, so even a player bouncing between screens stays under it.
const MIN_GAP = 30_000;

let refreshing: Promise<void> | null = null;

/** Fetches the referral status, unless it was fetched less than 30 s ago. */
export function refreshReferrals(): Promise<void> {
  refreshing ??= (async () => {
    const wallet = useTierStore.getState().walletSecret;
    if (!wallet) {
      useReferrals.setState({ offline: true });
      return;
    }
    if (Date.now() - useReferrals.getState().fetchedAt < MIN_GAP) return;
    try {
      const status = parseReferralStatus(await referralStatus(wallet));
      useReferrals.setState({ offline: false, fetchedAt: Date.now(), ...(status ? { status } : null) });
    } catch {
      // Out of reach: what was known stays shown, and the next refresh tries again.
      useReferrals.setState({ offline: true });
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Moves the pot onto the balance; the credits collected. A second tap meanwhile does nothing. */
export async function collectPot(): Promise<number> {
  const { status, collecting } = useReferrals.getState();
  const wallet = useTierStore.getState().walletSecret;
  if (collecting || !status || status.pending <= 0 || !wallet) return 0;
  useReferrals.setState({ collecting: true, collectFailed: false });
  let got: number;
  try {
    got = count(await collectReferrals(wallet));
  } catch {
    useReferrals.setState({ collecting: false, collectFailed: true });
    return 0;
  }
  const before = useCredits.getState().balance;
  // The new balance and the show in one step, like a pack bought (shop.ts): the counter
  // counts up from the old balance while the bolts fly.
  if (got > 0 && before !== null) setBalance(before + got);
  useReferrals.setState((s) => ({
    collecting: false,
    status: s.status ? { ...s.status, pending: 0 } : s.status,
    celebration: got > 0 && before !== null ? { from: before, to: before + got, key: Date.now() } : null,
  }));
  // Then the server's own balance: another device may have spent meanwhile.
  openWallet();
  return got;
}

/** The lists the player can share as a challenge: their own rankings, latest first. */
export function inviteCandidates(lists: Record<string, TierList>): TierList[] {
  return Object.values(lists)
    .filter((l) => !l.daily && !l.mail && !l.challenge && Object.values(l.placement).some((ids) => ids.length > 0))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
