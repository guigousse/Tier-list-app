import { useMemo } from 'react';

import type { TierList } from '../store/types';
import { useTierStore } from '../store/useTierStore';
import { restoreProgressApi, saveBadgeChoiceApi } from './api';
import { bestStreak, completedCount, dailyStreak } from './streak';

type Restored = { completed: number; days: string[] };

/**
 * Where the player stands on the reward paths: the phone's lists, and what the server
 * kept of them (`restored`), so a reinstall doesn't send the paths back to zero.
 */
export function playerProgress(lists: TierList[], restored: Restored, now = new Date()) {
  return {
    completed: Math.max(completedCount(lists), restored.completed),
    bestStreak: bestStreak(lists, restored.days),
    streak: dailyStreak(lists, now, restored.days),
  };
}

export function useProgress() {
  const lists = useTierStore((s) => s.lists);
  const restored = useTierStore((s) => s.restored);
  return useMemo(() => playerProgress(Object.values(lists), restored), [lists, restored]);
}

/**
 * What the server's answer changes: the progress kept, the steps reached counted as
 * celebrated (a reinstall doesn't replay them all), and the VS chosen. A choice on the
 * phone stays as it is; those the server lacks are sent (`toSave`).
 */
export function applyRestore(
  state: { lists: TierList[]; celebrated: { lists: number; flame: number } | null; badgeChoices: Record<string, string> },
  server: Restored & { choices: Record<string, string> },
  now = new Date(),
) {
  const restored = { completed: server.completed, days: server.days };
  const p = playerProgress(state.lists, restored, now);
  const celebrated = { lists: Math.max(state.celebrated?.lists ?? 0, p.completed), flame: Math.max(state.celebrated?.flame ?? 0, p.bestStreak) };
  const toSave = Object.entries(state.badgeChoices).filter(([fork]) => !server.choices[fork]);
  return { restored, celebrated, badgeChoices: { ...server.choices, ...state.badgeChoices }, toSave };
}

/** At launch, once the identity is back: the progress the server kept. Offline: nothing changes. */
export async function restoreProgress(): Promise<void> {
  const { deviceId } = useTierStore.getState();
  try {
    const server = await restoreProgressApi(deviceId);
    const { lists, celebrated, badgeChoices } = useTierStore.getState();
    const next = applyRestore({ lists: Object.values(lists), celebrated, badgeChoices }, server);
    useTierStore.setState({ restored: next.restored, celebrated: next.celebrated, badgeChoices: next.badgeChoices });
    await Promise.all(next.toSave.map(([fork, badge]) => saveBadgeChoiceApi(deviceId, fork, badge)));
  } catch {
    // Out of reach: the next launch tries again.
  }
}
