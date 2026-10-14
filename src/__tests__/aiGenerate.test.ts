import { creditCost, generateCards, imageCredits, useAiJob } from '../lib/aiGenerate';
import { aiIcons, aiWords } from '../lib/api';
import { useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({
  aiWords: jest.fn(),
  aiIcons: jest.fn(),
}));
jest.mock('../lib/aiIconFiles', () => ({ cacheAiIcon: jest.fn() }));

const words = aiWords as jest.Mock;
const icons = aiIcons as jest.Mock;
const store = () => useTierStore.getState();

beforeEach(() => {
  useTierStore.setState({ lists: {} });
  useAiJob.setState({ job: null });
  words.mockReset();
  icons.mockReset();
});

describe('AI generation', () => {
  it('costs 1 credit per card, and images cost less each the more there are', () => {
    expect(creditCost(10, false)).toBe(10);
    // One drawing sheet for the whole list: a fixed part, then a little per image.
    expect(imageCredits(3)).toBe(21);
    expect(imageCredits(10)).toBe(42);
    expect(imageCredits(20)).toBe(72);
    expect(imageCredits(3) / 3).toBeGreaterThan(imageCredits(10) / 10);
    expect(creditCost(10, true)).toBe(52);
  });

  it('adds the words first, then gives each card its icon', async () => {
    const id = store().createList({ title: 'Fromages', tierLabels: ['S', 'A'], cardLabels: ['Comté'] });
    words.mockResolvedValue({
      cards: [
        { label: 'Brie', emoji: '🧀', concept: 'brie' },
        { label: 'Croissant', emoji: '🥐', concept: 'croissant' },
        { label: 'Feta', emoji: '🧀', concept: 'feta-block' },
      ],
    });
    icons.mockResolvedValue({
      icons: [
        { concept: 'brie', url: 'https://x/brie.png' },
        { concept: 'feta-block', url: null },
      ],
    });

    await generateCards(id, 'Fromages', 3, true);

    expect(words).toHaveBeenCalledWith(expect.any(String), 'Fromages', 3, ['Comté']);
    const cards = Object.values(store().lists[id].cards);
    expect(cards.map((c) => c.label)).toEqual(['Comté', '🧀 Brie', '🥐 Croissant', '🧀 Feta']);
    // One sheet for the whole list; "Croissant" is already drawn in the app.
    expect(icons).toHaveBeenCalledTimes(1);
    expect(icons.mock.calls[0][1]).toEqual([
      { label: 'Brie', concept: 'brie' },
      { label: 'Feta', concept: 'feta-block' },
    ]);
    expect(cards.find((c) => c.label === '🧀 Brie')?.iconUrl).toBe('https://x/brie.png');
    expect(cards.find((c) => c.label === '🧀 Feta')?.iconUrl).toBeUndefined();
    expect(useAiJob.getState().job).toMatchObject({ phase: 'done', cards: 3, icons: 2, failed: 1 });
  });

  it('keeps the cards when an icon fails, and reports a refused theme', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'] });
    words.mockResolvedValue({ cards: [{ label: 'Truc', emoji: '❓', concept: 'thing' }] });
    icons.mockRejectedValue(new Error('icon failed'));
    await generateCards(id, 'T', 1, true);
    expect(Object.keys(store().lists[id].cards)).toHaveLength(1);
    expect(useAiJob.getState().job).toMatchObject({ phase: 'done', failed: 1 });

    words.mockRejectedValue(new Error('theme refused'));
    await generateCards(id, 'T', 1, false);
    expect(useAiJob.getState().job?.phase).toBe('error');
    expect(useAiJob.getState().job?.error).toContain('thème');
  });
});
