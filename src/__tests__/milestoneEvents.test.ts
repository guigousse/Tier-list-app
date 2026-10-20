import { FORKS } from '../lib/badges';
import { crossedSteps, pendingCelebrations, replayListSteps, TEAM_LINES, teamLine } from '../lib/milestoneEvents';
import { milestones } from '../lib/rewards';
import { migrateStore } from '../store/useTierStore';

describe('the steps crossed on a reward path', () => {
  it('nothing when the player did not move', () => {
    expect(crossedSteps('lists', 40, 40, {})).toEqual([]);
    expect(crossedSteps('flame', 3, 2, {})).toEqual([]);
  });

  it('every step crossed, in order, its items together, the VS apart', () => {
    const events = crossedSteps('lists', 0, 60, {});
    // Every step of the path between the two values, none outside.
    expect(events.every((e) => e.at > 0 && e.at <= 60)).toBe(true);
    expect(events.map((e) => e.at)).toEqual([...events.map((e) => e.at)].sort((a, b) => a - b));
    const steps = milestones('lists').filter((m) => m.at <= 60);
    expect(events.filter((e) => e.kind === 'step').map((e) => e.kind === 'step' && e.rewards)).toEqual(steps.map((m) => m.rewards));
    // No credits any more.
    expect(events.every((e) => e.kind === 'step' || e.kind === 'vs')).toBe(true);
    // The VS of 12, 35 and 60.
    expect(events.filter((e) => e.kind === 'vs').map((e) => e.kind === 'vs' && e.fork.id)).toEqual(['food', 'pet', 'sauce']);
    // Keys tell two events apart, for the queue.
    expect(new Set(events.map((e) => e.key)).size).toBe(events.length);
  });

  it('a step with several items is one celebration, all of them in it', () => {
    const step = milestones('flame').find((m) => m.rewards.length > 1)!;
    const events = crossedSteps('flame', step.at - 1, step.at, {});
    expect(events).toHaveLength(1);
    expect(events[0].kind === 'step' && events[0].rewards).toEqual(step.rewards);
  });

  it('at one step, the items first, then the VS', () => {
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
    expect(events).toHaveLength(1);
    expect(events.every((e) => e.kind === 'step' && e.track === 'flame')).toBe(true);
  });
});

describe('what is left to celebrate', () => {
  it('the first time, nothing: the progress so far counts as celebrated', () => {
    expect(pendingCelebrations(null, { lists: 80, flame: 9 }, {})).toEqual({ events: [], celebrated: { lists: 80, flame: 9 } });
  });

  it('the steps crossed since, on both paths, and never twice', () => {
    const { events, celebrated } = pendingCelebrations({ lists: 24, flame: 0 }, { lists: 25, flame: 1 }, {});
    expect(events.some((e) => e.track === 'flame' && e.kind === 'step' && e.at === 1)).toBe(true);
    expect(celebrated).toEqual({ lists: 25, flame: 1 });
    // A list deleted then redone: 24 then 25 again, nothing new.
    expect(pendingCelebrations({ lists: 25, flame: 1 }, { lists: 24, flame: 1 }, {}).celebrated).toEqual({ lists: 25, flame: 1 });
    expect(pendingCelebrations({ lists: 25, flame: 1 }, { lists: 25, flame: 1 }, {}).events).toEqual([]);
  });
});

describe('replaying the lists path (test tool)', () => {
  it('forgets the lists steps and the VS chosen, keeps the flame', () => {
    const reset = replayListSteps({ celebrated: { lists: 80, flame: 9 }, badgeChoices: { pet: 'cat' }, shownBadges: ['cat', 'old'] });
    expect(reset).toEqual({ celebrated: { lists: 0, flame: 9 }, badgeChoices: {}, shownBadges: [] });
    // Every lists step comes back, none of the flame.
    const { events } = pendingCelebrations(reset.celebrated, { lists: 80, flame: 9 }, reset.badgeChoices);
    expect(events.length).toBe(crossedSteps('lists', 0, 80, {}).length);
    expect(events.every((e) => e.track === 'lists')).toBe(true);
  });

  it('nothing celebrated yet: the flame stays where the player is', () => {
    expect(replayListSteps({ celebrated: null, badgeChoices: {}, shownBadges: [] }, 4).celebrated).toEqual({ lists: 0, flame: 4 });
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
