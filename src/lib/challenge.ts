import type { TierList } from '../store/types';
import { mailAgreement } from '../store/useMail';
import { rankingOf, useTierStore } from '../store/useTierStore';
import { claimChallenge } from './api';

export type ChallengeResult = {
  /** The player's tier index per card sent (-1 while a card isn't ranked). */
  mine: number[];
  theirs: number[];
  /** 0–100, or null when the sharer had ranked nothing to compare with. */
  score: number | null;
  /** Indexes of the cards both ranked, in different tiers. */
  differences: number[];
};

/** The player's ranking of a challenge against the sharer's. */
export function challengeResult(list: TierList): ChallengeResult {
  const challenge = list.challenge!;
  const tierOf = new Map<string, number>();
  list.tiers.forEach((tier, i) => (list.placement[tier.id] ?? []).forEach((id) => tierOf.set(id, i)));
  const mine = challenge.cardIds.map((id) => tierOf.get(id) ?? -1);
  const theirs = challenge.theirRanks;
  const compared = mine.some((r, i) => r >= 0 && (theirs[i] ?? -1) >= 0);
  return {
    mine,
    theirs,
    // Same scale as two friends comparing a list sent between them.
    score: compared ? mailAgreement(mine, theirs, list.tiers.length) : null,
    differences: mine.flatMap((r, i) => (r >= 0 && theirs[i] >= 0 && r !== theirs[i] ? [i] : [])),
  };
}

let claiming: Promise<void> | null = null;

/**
 * Tells the server about each challenge ranked from a share code, once per list, so it can
 * credit the sharer. Not before Apple vouched for this wallet: the server would see a player
 * who isn't new and answer not_new, and that answer is final. Called again at each launch,
 * return to the app and attestation, so a failed call is only postponed.
 */
export function claimChallenges(): Promise<void> {
  claiming ??= (async () => {
    const { walletSecret, walletAttested, deviceId } = useTierStore.getState();
    if (!walletSecret || !walletAttested) return;
    const due = Object.values(useTierStore.getState().lists).filter((l) => l.challenge?.code && l.challenge.answeredAt && !l.challenge.claimed);
    for (const list of due) {
      try {
        await claimChallenge(walletSecret, deviceId, list.challenge!.code!);
        // Whatever the status, the server has decided: asking again would change nothing.
        useTierStore.getState().markChallengeClaimed(list.id);
      } catch {
        // Offline or rate-limited: the next call tries again.
      }
    }
  })().finally(() => {
    claiming = null;
  });
  return claiming;
}

/** Whether every card of a challenge is placed: it can be validated. */
export const challengeReady = (list: TierList) => Boolean(list.challenge && list.pool.length === 0 && rankingOf(list, list.challenge.cardIds));
