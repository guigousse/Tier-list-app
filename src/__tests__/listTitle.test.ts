import { clampTitle, MAX_TITLE } from '../lib/listTitle';
import { useTierStore } from '../store/useTierStore';

describe('the title of a list, on one line', () => {
  it('keeps a short title as it is', () => {
    expect(clampTitle('  Fruits  ')).toBe('Fruits');
  });

  it('cuts a long title to the limit, without a space at the end', () => {
    const t = clampTitle('Les meilleurs fruits exotiques et de saison du marché');
    expect(t.length).toBeLessThanOrEqual(MAX_TITLE);
    expect(t).toBe(t.trim());
    expect('Les meilleurs fruits exotiques et de saison du marché'.startsWith(t)).toBe(true);
  });

  it('never splits an emoji in half', () => {
    const t = clampTitle('🍓'.repeat(40));
    expect(Array.from(t).every((c) => c === '🍓')).toBe(true);
  });

  it('the store keeps titles within the limit: created, renamed, duplicated', () => {
    const s = useTierStore.getState();
    const id = s.createList({ title: 'x'.repeat(80), tierLabels: ['S'] });
    expect(useTierStore.getState().lists[id].title.length).toBe(MAX_TITLE);
    s.renameList(id, 'y'.repeat(80));
    expect(useTierStore.getState().lists[id].title.length).toBe(MAX_TITLE);
    const copy = s.duplicateList(id)!;
    expect(Array.from(useTierStore.getState().lists[copy].title).length).toBeLessThanOrEqual(MAX_TITLE);
  });
});
