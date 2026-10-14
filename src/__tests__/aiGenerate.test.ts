import { creditCost, generateCards, useAiJob } from '../lib/aiGenerate';
import { aiIcon, aiWords } from '../lib/api';
import { useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({
  aiWords: jest.fn(),
  aiIcon: jest.fn(),
}));

const words = aiWords as jest.Mock;
const icon = aiIcon as jest.Mock;
const store = () => useTierStore.getState();

beforeEach(() => {
  useTierStore.setState({ lists: {} });
  useAiJob.setState({ job: null });
  words.mockReset();
  icon.mockReset();
});

describe('AI generation', () => {
  it('costs 1 credit per card and 8 more per image', () => {
    expect(creditCost(10, false)).toBe(10);
    expect(creditCost(10, true)).toBe(90);
  });

  it('adds the words first, then gives each card its icon', async () => {
    const id = store().createList({ title: 'Fromages', tierLabels: ['S', 'A'], cardLabels: ['Comté'] });
    words.mockResolvedValue({ cards: [{ label: 'Brie', emoji: '🧀', concept: 'brie' }, { label: 'Croissant', emoji: '🥐', concept: 'croissant' }] });
    icon.mockResolvedValue({ concept: 'brie', svg: '<svg/>', reused: false });

    await generateCards(id, 'Fromages', 2, true);

    expect(words).toHaveBeenCalledWith(expect.any(String), 'Fromages', 2, ['Comté']);
    const cards = Object.values(store().lists[id].cards);
    expect(cards.map((c) => c.label)).toEqual(['Comté', '🧀 Brie', '🥐 Croissant']);
    // "Croissant" is already drawn in the app: only "Brie" is asked for.
    expect(icon).toHaveBeenCalledTimes(1);
    expect(cards.find((c) => c.label === '🧀 Brie')?.iconSvg).toBe('<svg/>');
    expect(useAiJob.getState().job).toMatchObject({ phase: 'done', cards: 2, icons: 2, failed: 0 });
  });

  it('keeps the cards when an icon fails, and reports a refused theme', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'] });
    words.mockResolvedValue({ cards: [{ label: 'Truc', emoji: '❓', concept: 'thing' }] });
    icon.mockRejectedValue(new Error('icon failed'));
    await generateCards(id, 'T', 1, true);
    expect(Object.keys(store().lists[id].cards)).toHaveLength(1);
    expect(useAiJob.getState().job).toMatchObject({ phase: 'done', failed: 1 });

    words.mockRejectedValue(new Error('theme refused'));
    await generateCards(id, 'T', 1, false);
    expect(useAiJob.getState().job?.phase).toBe('error');
    expect(useAiJob.getState().job?.error).toContain('thème');
  });
});
