import { canVote, featuredIn } from '../lib/i18n/regions';

describe('regional lists', () => {
  it('puts a list without regions forward everywhere, worldwide included', () => {
    expect(featuredIn({}, 'FR')).toBe(true);
    expect(featuredIn({}, null)).toBe(true);
  });

  it('puts a regional list forward only in its regions', () => {
    const election = { regions: ['FR'] };
    expect(featuredIn(election, 'FR')).toBe(true);
    expect(featuredIn(election, 'GR')).toBe(false);
    // "Worldwide" shows only the lists for all.
    expect(featuredIn(election, null)).toBe(false);
  });

  it('lets only the players of its countries vote on a list kept to them', () => {
    expect(canVote({}, 'GR')).toBe(true);
    expect(canVote({ voteRegions: ['FR'] }, 'FR')).toBe(true);
    expect(canVote({ voteRegions: ['FR'] }, 'BE')).toBe(false);
    expect(canVote({ voteRegions: ['FR'] }, null)).toBe(false);
  });
});

describe('a vote kept to other countries', () => {
  const { keptVote } = jest.requireActual('../store/useCatalog') as typeof import('../store/useCatalog');
  const election = { key: 'presidentielle', title: 'Présidentielle', emoji: '🗳️', items: ['A', 'B'], voteRegions: ['FR'] };
  const popular = (key: string) => ({ popular: { key, voteKey: `popular:${key}:x`, cardIds: [] } }) as never;

  it('names the countries to a player from elsewhere', () => {
    expect(keptVote(popular('presidentielle'), [election], [], 'GR')).toEqual(['FR']);
    expect(keptVote(popular('presidentielle'), [election], [], 'FR')).toBeNull();
    expect(keptVote(popular('fruits'), [election], [], 'GR')).toBeNull();
  });

  it('finds a daily list, played on its day or later as a popular one', () => {
    const day = { day: '2027-04-10', title: 'Second tour', emoji: '🗳️', items: ['A'], voteRegions: ['FR'] };
    expect(keptVote({ daily: { day: '2027-04-10', emoji: '', cardIds: [] } } as never, [], [day], 'ES')).toEqual(['FR']);
    expect(keptVote(popular('daily-2027-04-10'), [], [null, day], 'ES')).toEqual(['FR']);
  });
});
