import { useEffect } from 'react';
import { create } from 'zustand';

import { pendingCelebrations, type Celebration } from '../../lib/milestoneEvents';
import { bestStreak, completedCount } from '../../lib/streak';
import { useTierStore } from '../../store/useTierStore';
import { MilestoneCelebration } from './MilestoneCelebration';

/** The steps waiting to be celebrated, in order. */
const useCelebrations = create<{ queue: Celebration[] }>(() => ({ queue: [] }));

/** Steps newly crossed join the queue; they then count as celebrated. */
function check() {
  const { lists, celebrated, badgeChoices } = useTierStore.getState();
  const all = Object.values(lists);
  const won = { lists: completedCount(all), flame: bestStreak(all) };
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
      if (state.lists !== prev.lists || state.celebrated !== prev.celebrated) check();
    });
  }, []);

  if (queue.length === 0) return null;
  return <MilestoneCelebration queue={queue} onDone={() => useCelebrations.setState({ queue: [] })} />;
}
