import { useEffect } from 'react';
import { create } from 'zustand';

import { pendingCelebrations, type Celebration } from '../../lib/milestoneEvents';
import { playerProgress } from '../../lib/progress';
import { useTierStore } from '../../store/useTierStore';
import { MilestoneCelebration } from './MilestoneCelebration';

/** The steps waiting to be celebrated, in order. */
const useCelebrations = create<{ queue: Celebration[] }>(() => ({ queue: [] }));

/** Whether a step is being celebrated full screen: other sheets wait for it to end. */
export const useCelebrating = () => useCelebrations((s) => s.queue.length > 0);

/** Steps newly crossed join the queue; they then count as celebrated. */
function check() {
  const { lists, restored, celebrated, badgeChoices } = useTierStore.getState();
  const progress = playerProgress(Object.values(lists), restored);
  const won = { lists: progress.completed, flame: progress.bestStreak };
  const { events, celebrated: next } = pendingCelebrations(celebrated, won, badgeChoices);
  if (!celebrated || next.lists !== celebrated.lists || next.flame !== celebrated.flame) useTierStore.setState({ celebrated: next });
  if (events.length) {
    const { queue } = useCelebrations.getState();
    useCelebrations.setState({ queue: [...queue, ...events.filter((e) => !queue.some((x) => x.key === e.key))] });
  }
}

/**
 * Watches the player's progress on the two reward paths and celebrates, full screen,
 * every step crossed: right after a list is validated, wherever the player is. A step
 * counts as celebrated as soon as it's queued, so the app closed meanwhile won't show it
 * again (a VS left for later still waits on the rewards page).
 */
export function MilestoneWatcher() {
  const queue = useCelebrations((s) => s.queue);
  useEffect(() => {
    check();
    return useTierStore.subscribe((state, prev) => {
      // Celebrated set back (test tool in Settings): the steps come again.
      if (state.lists !== prev.lists || state.celebrated !== prev.celebrated || state.restored !== prev.restored) check();
    });
  }, []);

  if (queue.length === 0) return null;
  return <MilestoneCelebration queue={queue} onDone={() => useCelebrations.setState({ queue: [] })} />;
}
