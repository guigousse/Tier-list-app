import { placementLocked, startsEditing } from '../lib/editorMode';
import type { TierList } from '../store/types';

const list = (over: Partial<TierList> = {}) => ({ cards: { c1: {} }, ...over }) as unknown as TierList;

describe('the editor’s modes', () => {
  it('a new or empty list of the player opens in edit mode, a fixed list never', () => {
    expect(startsEditing(list(), true)).toBe(true);
    expect(startsEditing(list({ cards: {} }), false)).toBe(true);
    expect(startsEditing(list(), false)).toBe(false);
    expect(startsEditing(list({ cards: {}, popular: {} } as unknown as Partial<TierList>), true)).toBe(false);
  });

  it('cards are placed in ranking mode only: never while editing, nor once a received list is answered', () => {
    expect(placementLocked(list(), true)).toBe(true);
    expect(placementLocked(list(), false)).toBe(false);
    expect(placementLocked(list({ mail: { answeredAt: '2026-10-16' } } as unknown as Partial<TierList>), false)).toBe(true);
  });
});
