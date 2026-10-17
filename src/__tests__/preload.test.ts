import type { Template } from '../constants/presets';
import { coverUrls } from '../lib/preload';

const t = (key: string, concepts: string[], day?: string) =>
  ({ key, title: key, emoji: '✨', items: concepts.map((c) => `🍎 ${c}`), concepts, day }) as Template;

describe('the pictures loaded ahead, before the public lists are opened', () => {
  it('the picture of every public list, each once', () => {
    const icons = { apple: 'u/apple', pear: 'u/pear', kiwi: 'u/kiwi' };
    const lists = [t('fruits', ['apple', 'pear']), t('more', ['kiwi', 'apple']), t('again', ['apple'])];
    expect(coverUrls(lists, { fruits: 1 }, icons)).toEqual(['u/pear', 'u/kiwi', 'u/apple']);
  });

  it('nothing for a list with no picture', () => {
    expect(coverUrls([t('daily-2026-10-13', [], '2026-10-13')], {}, {})).toEqual([]);
  });
});
