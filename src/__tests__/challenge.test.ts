import { claimChallenge } from '../lib/api';
import { challengeResult, claimChallenges } from '../lib/challenge';
import { isFixed, placementLocked } from '../lib/editorMode';
import { decodeShared, offlineLink, toPayload, type SharedList } from '../lib/share';
import type { TierList } from '../store/types';
import { migrateStore, useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({ ...jest.requireActual('../lib/api'), claimChallenge: jest.fn() }));
const claim = claimChallenge as jest.MockedFunction<typeof claimChallenge>;

const store = () => useTierStore.getState();

const shared: SharedList = {
  code: 'K7F3QX',
  from: 'Ana',
  title: 'Fruits',
  tiers: [
    { label: 'S', color: '#FF7F7F' },
    { label: 'A', color: '#FFBF7F' },
    { label: 'B', color: '#FFDF7F' },
  ],
  cards: [
    { label: 'Pomme', color: '#2B2F3A', tier: 0 },
    { label: 'Banane', color: '#2B2F3A', tier: 2 },
    { label: 'Kiwi', color: '#2B2F3A', tier: -1 },
  ],
};

const own: TierList = {
  id: 'l1',
  title: 'Fruits',
  tiers: [{ id: 't1', label: 'S', color: '#FF7F7F' }],
  cards: { a: { id: 'a', label: 'Pomme', color: '#2B2F3A' } },
  placement: { t1: ['a'] },
  pool: [],
  favorite: false,
  createdAt: 0,
  updatedAt: 0,
  openedAt: 0,
};

/** Ranks every card of a challenge list: `ranks[i]` for the i-th card sent. */
function rankAll(id: string, ranks: number[]) {
  const list = store().lists[id];
  list.challenge!.cardIds.forEach((cid, i) => store().moveCard(id, cid, list.tiers[ranks[i]].id));
}

beforeEach(() => {
  useTierStore.setState({ lists: {}, walletSecret: 'w', walletAttested: true });
  claim.mockReset();
});

describe('the sharer’s pseudo in the payload', () => {
  it('travels with the list and is read back, optional', () => {
    expect(toPayload(own, 'Ana').f).toBe('Ana');
    expect(toPayload(own)).not.toHaveProperty('f');
    expect(decodeShared(offlineLink(own, 'Ana'))?.from).toBe('Ana');
    expect(decodeShared(offlineLink(own))?.from).toBeUndefined();
  });

  it('ignores a pseudo that isn’t text, and cuts a long one', () => {
    const encode = (f: unknown) => Buffer.from(JSON.stringify({ ...toPayload(own), f })).toString('base64url');
    expect(decodeShared(encode(42))?.from).toBeUndefined();
    expect(decodeShared(encode('x'.repeat(50)))?.from).toHaveLength(20);
  });
});

describe('a list opened from a share link', () => {
  it('becomes a challenge: every card to rank, the sharer’s ranking kept aside', () => {
    const id = store().importList(shared);
    const list = store().lists[id];
    expect(list.pool).toHaveLength(3);
    expect(Object.values(list.placement).flat()).toEqual([]);
    expect(list.challenge).toEqual({ code: 'K7F3QX', from: 'Ana', theirRanks: [0, 2, -1], cardIds: list.pool });
    expect(list.challenge!.cardIds.map((cid) => list.cards[cid].label)).toEqual(['Pomme', 'Banane', 'Kiwi']);
    expect(store().importList(shared)).toBe(id);
  });

  it('from an offline link: no code to credit anyone with', () => {
    const fromLink = decodeShared(offlineLink(own))!;
    const id = store().importList(fromLink);
    const list = store().lists[id];
    expect(list.challenge?.code).toBeUndefined();
    expect(list.challenge?.theirRanks).toEqual([0]);
  });

  it('is fixed, and frozen once validated', () => {
    const id = store().importList(shared);
    expect(isFixed(store().lists[id])).toBe(true);
    expect(store().answerChallenge(id)).toBe(false);
    rankAll(id, [0, 1, 2]);
    expect(placementLocked(store().lists[id], false)).toBe(false);
    expect(store().answerChallenge(id)).toBe(true);
    expect(store().lists[id].challenge?.answeredAt).toEqual(expect.any(Number));
    expect(placementLocked(store().lists[id], false)).toBe(true);
  });

  it('a list received from a friend stays a received list, not a challenge', () => {
    const id = store().receiveMail({ id: 'm1', from: 'Lucas', list: shared });
    expect(store().lists[id].challenge).toBeUndefined();
  });
});

describe('lists imported before challenges', () => {
  it('come out of the saved data as they were: editable, cards where they were', () => {
    const before = { ...own, importedFrom: 'ABCDEF' };
    const data = migrateStore({ lists: { l1: before } }, 7);
    expect(data.lists!.l1).toEqual(before);
    expect(isFixed(data.lists!.l1)).toBe(false);
  });
});

describe('the agreement shown after validation', () => {
  it('compares tier by tier, and lists the cards ranked differently', () => {
    const id = store().importList({ ...shared, cards: shared.cards.map((c, i) => ({ ...c, tier: [0, 2, 1][i] })) });
    rankAll(id, [0, 0, 1]);
    const result = challengeResult(store().lists[id]);
    // Pomme same (1), Banane 2 tiers apart out of 2 (0), Kiwi same (1): 2/3.
    expect(result.score).toBe(67);
    expect(result.differences).toEqual([1]);
    expect(result.mine).toEqual([0, 0, 1]);
  });

  it('no percentage when the sharer ranked nothing', () => {
    const id = store().importList({ ...shared, cards: shared.cards.map((c) => ({ ...c, tier: -1 })) });
    rankAll(id, [0, 0, 1]);
    expect(challengeResult(store().lists[id]).score).toBeNull();
  });
});

describe('crediting the sharer', () => {
  const answered = (code = 'K7F3QX') => {
    const id = store().importList({ ...shared, code });
    rankAll(id, [0, 1, 2]);
    store().answerChallenge(id);
    return id;
  };

  it('claims once per list, after validation only', async () => {
    const pending = store().importList({ ...shared, code: 'ABCDEF' });
    const id = answered();
    claim.mockResolvedValue({ status: 'credited' });
    await claimChallenges();
    await claimChallenges();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(claim).toHaveBeenCalledWith('w', store().deviceId, 'K7F3QX');
    expect(store().lists[id].challenge?.claimed).toBe(true);
    expect(store().lists[pending].challenge?.claimed).toBeFalsy();
  });

  it('waits for the wallet to be attested (the server would answer not_new)', async () => {
    useTierStore.setState({ walletAttested: false });
    const id = answered();
    await claimChallenges();
    expect(claim).not.toHaveBeenCalled();
    useTierStore.setState({ walletAttested: true });
    claim.mockResolvedValue({ status: 'not_new' });
    await claimChallenges();
    expect(claim).toHaveBeenCalledTimes(1);
    expect(store().lists[id].challenge?.claimed).toBe(true);
  });

  it('tries again after a network failure or a rate limit', async () => {
    const id = answered();
    claim.mockRejectedValueOnce(new Error('Network request failed'));
    await claimChallenges();
    expect(store().lists[id].challenge?.claimed).toBeFalsy();
    claim.mockRejectedValueOnce(new Error('too many requests'));
    await claimChallenges();
    expect(store().lists[id].challenge?.claimed).toBeFalsy();
    claim.mockResolvedValueOnce({ status: 'already' });
    await claimChallenges();
    expect(claim).toHaveBeenCalledTimes(3);
    expect(store().lists[id].challenge?.claimed).toBe(true);
  });

  it('nothing to claim for a list opened from an offline link', async () => {
    const id = store().importList(decodeShared(offlineLink(own))!);
    store().moveCard(id, store().lists[id].pool[0], store().lists[id].tiers[0].id);
    store().answerChallenge(id);
    await claimChallenges();
    expect(claim).not.toHaveBeenCalled();
  });
});

describe('sharing a challenge', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  const calls = async (...args: Parameters<typeof import('../lib/api').createChallengeCode>) => {
    const fetchMock = jest.fn(async () => ({ ok: true, text: async () => '"K7F3QX"' }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const { createChallengeCode } = jest.requireActual<typeof import('../lib/api')>('../lib/api');
    expect(await createChallengeCode(...args)).toBe('K7F3QX');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    return { url, body: JSON.parse(init.body as string) };
  };

  it('ties the code to the wallet when there is one, with the pseudo', async () => {
    const { url, body } = await calls(own, 'w', 'Ana');
    expect(url).toMatch(/rpc\/share_challenge$/);
    expect(body).toEqual({ payload: expect.objectContaining({ t: 'Fruits', f: 'Ana' }), wallet: 'w' });
  });

  it('as before without a wallet', async () => {
    const { url, body } = await calls(own, null);
    expect(url).toMatch(/rpc\/share_list$/);
    expect(body).toEqual({ payload: expect.not.objectContaining({ f: expect.anything() }) });
  });
});
