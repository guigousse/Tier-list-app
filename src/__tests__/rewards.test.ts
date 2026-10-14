import { stickerSvg } from '../lib/stickers';
import { chooseBadge, FORKS, knownBadges, pendingForks } from '../lib/badges';
import { useTierStore } from '../store/useTierStore';
import { isArchived, type Mail } from '../store/useMail';
import { milestones, stretchFill, trackState } from '../lib/rewards';

describe('reward paths', () => {
  it('has a reward at every step of both paths', () => {
    expect(milestones('lists').map((m) => m.at)).toEqual([1, 3, 5, 10, 15, 25, 40, 50, 75, 100]);
    expect(milestones('flame').map((m) => m.at)).toEqual([1, 3, 7, 14, 21, 30, 50, 100]);
    expect([...milestones('lists'), ...milestones('flame')].every((m) => m.rewards.length > 0)).toBe(true);
  });

  it('follows the current flame but keeps the rewards of the best one', () => {
    const state = trackState('flame', { streak: 2, bestStreak: 9, completed: 0 });
    expect(state.value).toBe(2);
    expect(state.won).toBe(9);
    expect(state.next?.at).toBe(3);
  });

  it('fills each stretch of path in proportion', () => {
    expect(stretchFill(7, 5, 10)).toBeCloseTo(0.4);
    expect(stretchFill(2, 5, 10)).toBe(0);
    expect(stretchFill(12, 5, 10)).toBe(1);
  });
});

describe('challenge archive', () => {
  const mail = (patch: Partial<Mail>) => ({ id: 'm', status: 'ranked', seen: false, ...patch }) as Mail;

  it('archives received challenges once their comparison was opened', () => {
    expect(isArchived(mail({}), true, [])).toBe(false);
    expect(isArchived(mail({}), true, ['m'])).toBe(true);
    expect(isArchived(mail({ status: 'sent' }), true, ['m'])).toBe(false);
  });

  it('archives sent challenges once the friend’s ranking was seen', () => {
    expect(isArchived(mail({ seen: false }), false, [])).toBe(false);
    expect(isArchived(mail({ seen: true }), false, [])).toBe(true);
  });
});

describe('badges', () => {
  beforeEach(() => useTierStore.setState({ badgeChoices: {}, shownBadges: [], profile: null }));

  it('offers each fork once reached, between two badges found by id', () => {
    expect(pendingForks(1, {}).length).toBe(0);
    expect(pendingForks(12, {}).map((f) => f.id)).toEqual(['food', 'pet', 'sauce']);
    expect(pendingForks(12, { food: 'pizza' }).map((f) => f.id)).toEqual(['pet', 'sauce']);
    expect(new Set(FORKS.flatMap((f) => f.options.map((b) => b.id))).size).toBe(FORKS.length * 2);
    expect(knownBadges(['pizza', 'from-a-newer-app']).map((b) => b.id)).toEqual(['pizza']);
  });

  it('keeps the first side chosen for good and pins up to 3 badges', () => {
    const [food, pet, sauce, holiday] = FORKS;
    chooseBadge(food, food.options[0]);
    chooseBadge(food, food.options[1]);
    expect(useTierStore.getState().badgeChoices.food).toBe('pizza');
    chooseBadge(pet, pet.options[1]);
    chooseBadge(sauce, sauce.options[1]);
    chooseBadge(holiday, holiday.options[0]);
    expect(useTierStore.getState().shownBadges).toEqual(['pizza', 'cat', 'mayo']);
  });
});

describe('stickers', () => {
  it('has a drawing for every badge', () => {
    expect(FORKS.flatMap((f) => f.options).every((b) => stickerSvg(b.id).includes('<path') || stickerSvg(b.id).includes('<circle'))).toBe(true);
  });
});
