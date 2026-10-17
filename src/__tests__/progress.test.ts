import { restoreProgressApi, saveBadgeChoiceApi } from '../lib/api';
import { applyRestore, playerProgress, restoreProgress } from '../lib/progress';
import { bestStreak, dailyStreak } from '../lib/streak';
import { migrateStore, useTierStore } from '../store/useTierStore';
import type { TierList } from '../store/types';

jest.mock('../lib/api', () => ({ restoreProgressApi: jest.fn(), saveBadgeChoiceApi: jest.fn(async () => {}) }));

const restoreApi = restoreProgressApi as jest.Mock;
const saveChoice = saveBadgeChoiceApi as jest.Mock;

const daily = (day: string) => ({ daily: { day, emoji: '', cardIds: [], validatedAt: 1 } }) as unknown as TierList;
const popular = () => ({ popular: { voteKey: 'popular:x', validatedAt: 1 } }) as unknown as TierList;
const now = new Date(2026, 9, 13, 20);

describe('the flame with the days kept by the server', () => {
  it('days validated before a reinstall still count, with the local ones', () => {
    expect(bestStreak([daily('2026-10-13')], ['2026-10-11', '2026-10-12'])).toBe(3);
    expect(dailyStreak([daily('2026-10-13')], now, ['2026-10-12', '2026-10-11'])).toBe(3);
    // A day both local and on the server counts once.
    expect(bestStreak([daily('2026-10-12')], ['2026-10-12'])).toBe(1);
  });
});

describe('the progress of the player', () => {
  it('the lists completed: the larger of the phone and the server', () => {
    const lists = [daily('2026-10-13'), popular()];
    expect(playerProgress(lists, { completed: 30, days: [] }, now).completed).toBe(30);
    expect(playerProgress(lists, { completed: 1, days: [] }, now).completed).toBe(2);
  });

  it('the flame, record and current, over both', () => {
    const p = playerProgress([daily('2026-10-13')], { completed: 0, days: ['2026-10-12'] }, now);
    expect(p).toEqual({ completed: 1, bestStreak: 2, streak: 2 });
  });
});

describe('what the server gives back after a reinstall', () => {
  const server = { completed: 60, days: ['2026-10-11', '2026-10-12'], choices: { food: 'pizza', pet: 'cat' } };

  it('the steps reached count as celebrated: no flood of animations', () => {
    const next = applyRestore({ lists: [], celebrated: { lists: 0, flame: 0 }, badgeChoices: {} }, server, now);
    expect(next.restored).toEqual({ completed: 60, days: ['2026-10-11', '2026-10-12'] });
    expect(next.celebrated).toEqual({ lists: 60, flame: 2 });
  });

  it('never backs the celebrated steps down', () => {
    const next = applyRestore({ lists: [], celebrated: { lists: 80, flame: 9 }, badgeChoices: {} }, server, now);
    expect(next.celebrated).toEqual({ lists: 80, flame: 9 });
  });

  it('the VS chosen come back; a choice on the phone stays as it is', () => {
    const next = applyRestore({ lists: [], celebrated: null, badgeChoices: { pet: 'dog', sauce: 'mayo' } }, server, now);
    expect(next.badgeChoices).toEqual({ food: 'pizza', pet: 'dog', sauce: 'mayo' });
    // The server doesn't know the sauce yet: it is sent.
    expect(next.toSave).toEqual([['sauce', 'mayo']]);
  });
});

describe('restoring at launch', () => {
  beforeEach(() => {
    restoreApi.mockReset();
    saveChoice.mockClear();
    useTierStore.setState({ lists: {}, celebrated: { lists: 0, flame: 0 }, badgeChoices: { drink: 'coffee' }, restored: { completed: 0, days: [] } });
  });

  it('keeps what the server knows and sends the choices it lacks', async () => {
    restoreApi.mockResolvedValue({ completed: 25, days: ['2026-10-12'], choices: { food: 'burger' } });
    await restoreProgress();
    const state = useTierStore.getState();
    expect(restoreApi).toHaveBeenCalledWith(state.deviceId);
    expect(state.restored).toEqual({ completed: 25, days: ['2026-10-12'] });
    expect(state.badgeChoices).toEqual({ drink: 'coffee', food: 'burger' });
    expect(state.celebrated?.lists).toBe(25);
    expect(saveChoice).toHaveBeenCalledWith(state.deviceId, 'drink', 'coffee');
  });

  it('offline: nothing changes', async () => {
    restoreApi.mockRejectedValue(new Error('offline'));
    await restoreProgress();
    expect(useTierStore.getState().restored).toEqual({ completed: 0, days: [] });
  });
});

describe('the store of an older version', () => {
  it('has nothing restored yet', () => {
    expect(migrateStore({ lists: {} }, 6).restored).toEqual({ completed: 0, days: [] });
  });
});
