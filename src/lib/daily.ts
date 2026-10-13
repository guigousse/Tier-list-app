import type { TierList } from '../store/types';
import { useTierStore } from '../store/useTierStore';
import { submitDailyVote } from './api';

/** Tier index (0 = S … 4 = D) of each published item, or null if one isn't ranked. */
export function dailyRanks(list: TierList): number[] | null {
  if (!list.daily) return null;
  const tierOf = new Map<string, number>();
  list.tiers.forEach((t, i) => (list.placement[t.id] ?? []).forEach((id) => tierOf.set(id, i)));
  const ranks = list.daily.cardIds.map((id) => tierOf.get(id));
  return ranks.every((r) => r !== undefined) ? (ranks as number[]) : null;
}

/** Sends validated daily rankings that haven't reached the server yet (e.g. validated offline). */
export async function syncDailyVotes(): Promise<void> {
  const { lists, deviceId, markVoteSent } = useTierStore.getState();
  const pending = Object.values(lists).filter((l) => l.daily?.validatedAt && !l.daily.voteSent);
  for (const list of pending) {
    const ranks = dailyRanks(list);
    if (!ranks) continue;
    try {
      // false means this device already voted that day: nothing left to send either way.
      await submitDailyVote(list.daily!.day, deviceId, ranks);
      markVoteSent(list.id);
    } catch {
      // Offline or server error: retried on the next sync.
    }
  }
}
