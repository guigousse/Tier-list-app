import type { TierList } from '../store/types';
import { rankingOf, useTierStore } from '../store/useTierStore';
import { submitDailyVote, submitListVote } from './api';

/** Tier index (0 = S … 4 = D) of each published item of a daily list, or null if one isn't ranked. */
export function dailyRanks(list: TierList): number[] | null {
  if (!list.daily) return null;
  // The validated ranking, not moves made since without validating again.
  return list.daily.validatedRanks ?? rankingOf(list, list.daily.cardIds);
}

/**
 * Sends validated rankings (daily and popular tier lists) that haven't reached the
 * server yet, e.g. validated offline.
 */
let syncing: Promise<void> | null = null;

export function syncDailyVotes(): Promise<void> {
  // Several screens ask at once (validation, results): share one run.
  syncing ??= sendPendingVotes().finally(() => {
    syncing = null;
  });
  return syncing;
}

async function sendPendingVotes(): Promise<void> {
  const { lists, deviceId, markVoteSent } = useTierStore.getState();
  for (const list of Object.values(lists)) {
    try {
      if (list.daily?.validatedAt && !list.daily.voteSent) {
        const ranks = dailyRanks(list);
        if (!ranks) continue;
        // false means this device already voted that day: nothing left to send either way.
        await submitDailyVote(list.daily.day, deviceId, ranks);
        markVoteSent(list.id);
      } else if (list.popular?.validatedRanks && !list.popular.voteSent) {
        await submitListVote(list.popular.voteKey, deviceId, list.popular.validatedRanks);
        markVoteSent(list.id);
      }
    } catch {
      // Offline or server error: retried on the next sync.
    }
  }
}
