import { FORKS } from '../lib/badges';
import { crossedSteps, pendingCelebrations, TEAM_LINES, teamLine } from '../lib/milestoneEvents';
import { milestones } from '../lib/rewards';
import { migrateStore } from '../store/useTierStore';

describe('the steps crossed on a reward path', () => {
  it('nothing when the player did not move', () => {
    expect(crossedSteps('lists', 40, 40, {})).toEqual([]);
    expect(crossedSteps('flame', 3, 2, {})).toEqual([]);
  });

  it('every step crossed, in order, each reward on its own, credits apart', () => {
    const events = crossedSteps('lists', 0, 60, {});
    // Every step of the path between the two values, none outside.
    expect(events.every((e) => e.at > 0 && e.at <= 60)).toBe(true);
    expect(events.map((e) => e.at)).toEqual([...events.map((e) => e.at)].sort((a, b) => a - b));
    const items = milestones('lists').filter((m) => m.at <= 60).flatMap((m) => m.rewards);
    expect(events.filter((e) => e.kind === 'item')).toHaveLength(items.length);
    // Credits at 25 and 50.
    expect(events.filter((e) => e.kind === 'credits').map((e) => [e.at, e.kind === 'credits' && e.credits])).toEqual([
      [25, 5],
      [50, 5],
    ]);
    // The VS of 12, 35 and 60.
    expect(events.filter((e) => e.kind === 'vs').map((e) => e.kind === 'vs' && e.fork.id)).toEqual(['food', 'pet', 'sauce']);
    // Keys tell two events apart, for the queue.
    expect(new Set(events.map((e) => e.key)).size).toBe(events.length);
  });

  it('at one step, the item first, then the credits, then the VS', () => {
    const at = 60;
    const kinds = crossedSteps('lists', at - 1, at, {}).map((e) => e.kind);
    expect(kinds.indexOf('vs')).toBe(kinds.length - 1);
  });

  it('a VS already chosen on the rewards page is not offered again', () => {
    const pet = FORKS.find((f) => f.id === 'pet')!;
    expect(crossedSteps('lists', pet.at - 1, pet.at, { pet: 'cat' }).some((e) => e.kind === 'vs')).toBe(false);
  });

  it('the flame path has items only, no credits nor VS', () => {
    const first = milestones('flame')[0];
    const events = crossedSteps('flame', 0, first.at, {});
    expect(events.length).toBe(first.rewards.length);
    expect(events.every((e) => e.kind === 'item' && e.track === 'flame')).toBe(true);
  });
});

describe('what is left to celebrate', () => {
  it('the first time, nothing: the progress so far counts as celebrated', () => {
    expect(pendingCelebrations(null, { lists: 80, flame: 9 }, {})).toEqual({ events: [], celebrated: { lists: 80, flame: 9 } });
  });

  it('the steps crossed since, on both paths, and never twice', () => {
    const { events, celebrated } = pendingCelebrations({ lists: 24, flame: 0 }, { lists: 25, flame: 1 }, {});
    expect(events.some((e) => e.track === 'lists' && e.kind === 'credits' && e.at === 25)).toBe(true);
    expect(celebrated).toEqual({ lists: 25, flame: 1 });
    // A list deleted then redone: 24 then 25 again, nothing new.
    expect(pendingCelebrations({ lists: 25, flame: 1 }, { lists: 24, flame: 1 }, {}).celebrated).toEqual({ lists: 25, flame: 1 });
    expect(pendingCelebrations({ lists: 25, flame: 1 }, { lists: 25, flame: 1 }, {}).events).toEqual([]);
  });
});

describe('the line under the sticker chosen at a VS', () => {
  it('every team has its own', () => {
    for (const fork of FORKS) for (const badge of fork.options) expect(teamLine(badge.id)).toBeTruthy();
    expect(new Set(Object.values(TEAM_LINES)).size).toBe(Object.keys(TEAM_LINES).length);
    expect(teamLine('cat')).toBe('Ils sont si mignons.');
  });
});

describe('the store of an older version', () => {
  it('has no step celebrated yet: they start from where the player is', () => {
    expect(migrateStore({ lists: {} }, 5).celebrated).toBeNull();
  });
});
