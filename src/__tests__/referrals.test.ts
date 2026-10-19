import { collectReferrals, referralStatus } from '../lib/api';
import { openWallet, useCredits } from '../lib/credits';
import { t } from '../lib/i18n/useT';
import {
  collectPot,
  hasPot,
  inviteCandidates,
  parseReferralStatus,
  referralName,
  referralStep,
  refreshReferrals,
  useReferrals,
} from '../lib/referrals';
import type { TierList } from '../store/types';
import { useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({ ...jest.requireActual('../lib/api'), referralStatus: jest.fn(), collectReferrals: jest.fn() }));
jest.mock('../lib/credits', () => ({
  ...jest.requireActual('../lib/credits'),
  openWallet: jest.fn(async () => null),
}));
const status = referralStatus as jest.MockedFunction<typeof referralStatus>;
const collect = collectReferrals as jest.MockedFunction<typeof collectReferrals>;

const server = {
  pending: 35,
  count: 2,
  cap: 10,
  referrals: [
    { pseudo: 'Ana', lists: 1, active: false, since: '2026-10-18T10:00:00Z' },
    { pseudo: null, lists: 3, active: true, since: '2026-10-12T10:00:00Z' },
  ],
};

let now = 1_000_000;
beforeEach(() => {
  status.mockReset();
  collect.mockReset();
  (openWallet as jest.Mock).mockClear();
  now += 10 * 60_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  useTierStore.setState({ walletSecret: 'w', settings: { ...useTierStore.getState().settings, language: 'fr' } });
  useReferrals.setState({ status: null, offline: false, collecting: false, celebration: null, fetchedAt: 0 });
  useCredits.setState({ balance: 12 });
});

describe('the referral status from the server', () => {
  it('is read as it comes', () => {
    expect(parseReferralStatus(server)).toEqual(server);
  });

  it('stands a malformed answer: numbers bounded, bad rows dropped, no pseudo for a non-text', () => {
    expect(parseReferralStatus(null)).toBeNull();
    expect(parseReferralStatus('x')).toBeNull();
    expect(
      parseReferralStatus({
        pending: -4,
        count: '3',
        referrals: [{ pseudo: 42, lists: 9, active: 'yes', since: 1 }, 'nope', null],
      }),
    ).toEqual({ pending: 0, count: 0, cap: 10, referrals: [{ pseudo: null, lists: 3, active: false, since: '' }] });
  });
});

describe('each referral, as the sponsor sees it', () => {
  it('their pseudo, or a new player without a profile', () => {
    expect(referralName(server.referrals[0], t)).toBe('Ana');
    expect(referralName(server.referrals[1], t)).toBe('Un nouveau joueur');
  });

  it('the challenge taken and the public lists ranked, then active', () => {
    expect(referralStep(server.referrals[0], t)).toBe('Défi relevé ✓ · listes 1/3');
    expect(referralStep(server.referrals[1], t)).toBe('Actif ✓');
  });
});

describe('refreshing the status', () => {
  it('keeps it in memory, and the badge lights while the pot holds energy', async () => {
    status.mockResolvedValue(server);
    await refreshReferrals();
    expect(status).toHaveBeenCalledWith('w');
    expect(useReferrals.getState().status?.pending).toBe(35);
    expect(hasPot(useReferrals.getState())).toBe(true);
    useReferrals.setState({ status: { ...server, pending: 0 } });
    expect(hasPot(useReferrals.getState())).toBe(false);
    expect(hasPot({ status: null })).toBe(false);
  });

  it('asks the server at most twice a minute: it limits each address to 120 calls an hour', async () => {
    status.mockResolvedValue(server);
    await refreshReferrals();
    now += 10_000;
    await refreshReferrals();
    expect(status).toHaveBeenCalledTimes(1);
    now += 30_000;
    await refreshReferrals();
    expect(status).toHaveBeenCalledTimes(2);
  });

  it('offline: says so, keeps what it knew, and tries again next time', async () => {
    status.mockResolvedValue(server);
    await refreshReferrals();
    status.mockRejectedValue(new Error('offline'));
    now += 60_000;
    await refreshReferrals();
    expect(useReferrals.getState()).toMatchObject({ offline: true, status: { pending: 35 } });
    status.mockResolvedValue(server);
    await refreshReferrals();
    expect(status).toHaveBeenCalledTimes(3);
    expect(useReferrals.getState().offline).toBe(false);
  });

  it('without a wallet: nothing asked', async () => {
    useTierStore.setState({ walletSecret: null });
    await refreshReferrals();
    expect(status).not.toHaveBeenCalled();
    expect(useReferrals.getState().offline).toBe(true);
  });
});

describe('collecting the pot', () => {
  beforeEach(() => useReferrals.setState({ status: server }));

  it('adds it to the balance, empties the pot and plays the bolts from the old balance', async () => {
    collect.mockResolvedValue(35);
    await expect(collectPot()).resolves.toBe(35);
    expect(collect).toHaveBeenCalledWith('w');
    expect(useCredits.getState().balance).toBe(47);
    expect(useReferrals.getState().status?.pending).toBe(0);
    expect(hasPot(useReferrals.getState())).toBe(false);
    expect(useReferrals.getState().celebration).toMatchObject({ from: 12, to: 47 });
    // The server's own balance then, in case another device spent meanwhile.
    expect(openWallet).toHaveBeenCalled();
  });

  it('a double tap collects once', async () => {
    let answer: (n: number) => void = () => {};
    collect.mockReturnValue(new Promise((r) => (answer = r)));
    const first = collectPot();
    const second = collectPot();
    answer(35);
    await Promise.all([first, second]);
    expect(collect).toHaveBeenCalledTimes(1);
    expect(useCredits.getState().balance).toBe(47);
  });

  it('an empty pot: no call', async () => {
    useReferrals.setState({ status: { ...server, pending: 0 } });
    await collectPot();
    expect(collect).not.toHaveBeenCalled();
  });

  it('nothing collected after all (another device did): pot emptied, no show', async () => {
    collect.mockResolvedValue(0);
    await collectPot();
    expect(useReferrals.getState()).toMatchObject({ status: { pending: 0 }, celebration: null });
    expect(useCredits.getState().balance).toBe(12);
  });

  it('offline: the pot stays, the button can be tapped again', async () => {
    collect.mockRejectedValue(new Error('offline'));
    await expect(collectPot()).resolves.toBe(0);
    expect(useReferrals.getState()).toMatchObject({ status: { pending: 35 }, collecting: false, collectFailed: true });
  });
});

describe('the lists offered to invite friends with', () => {
  const list = (id: string, extra: Partial<TierList>, ranked = true): TierList => ({
    id,
    title: id,
    tiers: [{ id: 't', label: 'S', color: '#fff' }],
    cards: { c: { id: 'c', label: 'C', color: '#000' } },
    placement: { t: ranked ? ['c'] : [] },
    pool: ranked ? [] : ['c'],
    favorite: false,
    createdAt: 0,
    updatedAt: Number(id.slice(1)),
    openedAt: 0,
    ...extra,
  });

  it('the player’s own rankings, latest first: not the daily, nor what friends sent, nor empty ones', () => {
    const lists = {
      a1: list('a1', {}),
      a2: list('a2', { popular: { key: 'k', voteKey: 'v', cardIds: ['c'] } }),
      a3: list('a3', { daily: { day: 'd', emoji: 'x', cardIds: ['c'] } }),
      a4: list('a4', { challenge: { theirRanks: [0], cardIds: ['c'] } }),
      a5: list('a5', { mail: { id: 'm', from: 'Ana', cardIds: ['c'] } }),
      a6: list('a6', {}, false),
    };
    expect(inviteCandidates(lists).map((l) => l.id)).toEqual(['a2', 'a1']);
  });
});
