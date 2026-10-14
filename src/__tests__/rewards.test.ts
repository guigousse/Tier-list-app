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
