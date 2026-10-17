import { createProfile, submitListVote } from '../lib/api';
import { syncDailyVotes } from '../lib/daily';
import { restoreIdentity } from '../lib/identity';
import { creditsShow, crossedSteps, pendingCelebrations } from '../lib/milestoneEvents';
import { own } from '../lib/own';
import { saveProfile } from '../lib/social';
import type { TierList } from '../store/types';
import { useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({
  submitDailyVote: jest.fn(async () => true),
  submitListVote: jest.fn(async () => {}),
  createProfile: jest.fn(),
  updateProfile: jest.fn(async (_secret: string, pseudo: string, avatar: string) => ({ pseudo, tag: 1234, avatar })),
  setBadges: jest.fn(async () => {}),
  saveBadgeChoiceApi: jest.fn(async () => {}),
}));
jest.mock('../lib/identity', () => ({ restoreIdentity: jest.fn(async () => {}), saveIdentity: jest.fn(async () => {}) }));
jest.mock('../lib/push', () => ({ syncPushToken: jest.fn() }));

const listVote = submitListVote as jest.Mock;
const create = createProfile as jest.Mock;
const restore = restoreIdentity as jest.Mock;

describe('credits of the lists path', () => {
  it('are celebrated only for a wallet the server pays (attested by Apple)', () => {
    const won = { lists: 25, flame: 0 };
    const paid = pendingCelebrations({ lists: 24, flame: 0 }, won, {}, { credits: true }).events;
    const unpaid = pendingCelebrations({ lists: 24, flame: 0 }, won, {}, { credits: false }).events;
    expect(paid.some((e) => e.kind === 'credits')).toBe(true);
    expect(unpaid.some((e) => e.kind === 'credits')).toBe(false);
    expect(unpaid.length).toBe(crossedSteps('lists', 24, 25, {}).length - 1);
  });

  it('the counter never shows credits the server didn’t give', () => {
    // Paid now: counts from the old balance to the new one.
    expect(creditsShow(10, 15, 5)).toEqual({ from: 10, to: 15, paid: true });
    // Paid already at launch: the counter replays the last 5.
    expect(creditsShow(15, 15, 5)).toEqual({ from: 10, to: 15, paid: true });
    // Offline: the balance stays as it is, and the player is told.
    expect(creditsShow(10, null, 5)).toEqual({ from: 10, to: 10, paid: false });
  });
});

const popular = (ranks: number[], voteSent = false) =>
  ({
    id: 'p1',
    title: 'Fruits',
    tiers: [],
    cards: {},
    pool: [],
    createdAt: 0,
    updatedAt: 0,
    popular: { key: 'fruits', voteKey: 'popular:fruits:x', cardIds: [], validatedAt: 1, validatedRanks: ranks, voteSent },
  }) as unknown as TierList;

describe('sending validated rankings', () => {
  beforeEach(() => listVote.mockReset());

  it('a list the server doesn’t know any more is not sent again and again', async () => {
    listVote.mockRejectedValue(new Error('unknown list'));
    useTierStore.setState({ lists: { p1: popular([0, 1]) } });
    await syncDailyVotes();
    expect(useTierStore.getState().lists.p1.popular?.voteSent).toBe(true);
  });

  it('a ranking changed while the old one was on its way is sent too', async () => {
    let release = () => {};
    listVote.mockImplementationOnce(() => new Promise<void>((r) => (release = r))).mockResolvedValue(undefined);
    useTierStore.setState({ lists: { p1: popular([0, 1]) } });
    const first = syncDailyVotes();
    // The player ranks again and validates while [0, 1] is being sent.
    useTierStore.setState({ lists: { p1: popular([4, 4]) } });
    const second = syncDailyVotes();
    release();
    await first;
    await second;
    expect(listVote).toHaveBeenLastCalledWith('popular:fruits:x', expect.any(String), [4, 4]);
    expect(useTierStore.getState().lists.p1.popular?.voteSent).toBe(true);
  });
});

describe('creating a profile after a reinstall', () => {
  beforeEach(() => {
    create.mockReset();
    restore.mockReset();
    useTierStore.setState({ profile: null });
  });

  it('gets the old profile back from the Keychain rather than making a new one', async () => {
    restore.mockImplementation(async () => {
      useTierStore.setState({ profile: { id: 'me', secret: 's'.repeat(64), pseudo: 'Guigou', tag: 1234, avatar: 'a' } });
    });
    await saveProfile('Guigou2', 'a');
    expect(create).not.toHaveBeenCalled();
    expect(useTierStore.getState().profile).toMatchObject({ id: 'me', pseudo: 'Guigou2' });
  });

  it('creates one when the Keychain has none', async () => {
    create.mockResolvedValue({ id: 'new', pseudo: 'Léa', tag: 42, avatar: 'a' });
    await saveProfile('Léa', 'a');
    expect(create).toHaveBeenCalled();
  });
});

describe('a link to a list or a page that doesn’t exist', () => {
  it('finds nothing, even under a name every object has', () => {
    const lists = { a: 1 };
    expect(own(lists, 'a')).toBe(1);
    expect(own(lists, 'constructor')).toBeUndefined();
    expect(own(lists, 'toString')).toBeUndefined();
    expect(own(lists, undefined)).toBeUndefined();
  });
});
