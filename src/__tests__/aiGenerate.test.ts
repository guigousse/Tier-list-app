import { cardsNeedingImage, generateImages, generateWords, imageCredits, useAiJob, wordCredits } from '../lib/aiGenerate';
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
    expect(wordCredits(10)).toBe(10);
    // One drawing sheet for the whole list: a fixed part, then a little per image.
    expect(imageCredits(0)).toBe(0);
    expect(imageCredits(3)).toBe(5);
    expect(imageCredits(10)).toBe(12);
    expect(imageCredits(20)).toBe(22);
    expect(imageCredits(3) / 3).toBeGreaterThan(imageCredits(10) / 10);
  });

  it('adds the words only, and names the list after the theme', async () => {
    const id = store().createList({ title: 'Ma liste', tierLabels: ['S', 'A'], cardLabels: ['Comté'] });
    words.mockResolvedValue({
      cards: [
        { label: 'Brie', emoji: '🧀', concept: 'brie' },
        { label: 'Croissant', emoji: '🥐', concept: 'croissant' },
      ],
    });

    await generateWords(id, 'Fromages', 2);

    expect(words).toHaveBeenCalledWith(expect.any(String), 'Fromages', 2, ['Comté']);
    expect(icons).not.toHaveBeenCalled();
    const list = store().lists[id];
    expect(list.title).toBe('Fromages');
    expect(Object.values(list.cards).map((c) => c.label)).toEqual(['Comté', '🧀 Brie', '🥐 Croissant']);
    expect(useAiJob.getState().job).toMatchObject({ kind: 'words', phase: 'done', cards: 2 });
  });

  it('keeps the title when the theme is refused', async () => {
    const id = store().createList({ title: 'Ma liste', tierLabels: ['S'] });
    words.mockRejectedValue(new Error('theme refused'));
    await generateWords(id, 'Interdit', 3);
    expect(store().lists[id].title).toBe('Ma liste');
    expect(useAiJob.getState().job?.phase).toBe('error');
    expect(useAiJob.getState().job?.error).toContain('thème');
  });

  it('then draws the images of the cards the player kept, edited or added', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'] });
    words.mockResolvedValue({
      cards: [
        { label: 'Brie', emoji: '🧀', concept: 'brie' },
        { label: 'Croissant', emoji: '🥐', concept: 'croissant' },
        { label: 'Feta', emoji: '🧀', concept: 'feta-block' },
        { label: 'Gouda', emoji: '🧀', concept: 'gouda-wheel' },
      ],
    });
    await generateWords(id, 'Fromages', 4);
    const byLabel = (l: string) => Object.values(store().lists[id].cards).find((c) => c.label === l)!;
    // The player checks the words: renames one, deletes one, adds one by hand.
    store().updateCard(id, byLabel('🧀 Feta').id, { label: '🧀 Roquefort' });
    store().deleteCard(id, byLabel('🧀 Gouda').id);
    store().addCard(id, { label: 'Tomme', color: '#fff' });

    // "Croissant" is already drawn in the app.
    expect(cardsNeedingImage(store().lists[id]).map((c) => c.label)).toEqual(['🧀 Brie', '🧀 Roquefort', 'Tomme']);

    icons.mockResolvedValue({
      icons: [
        { concept: 'brie', url: 'https://x/brie.png' },
        { concept: 'roquefort', url: 'https://x/roquefort.png' },
        { concept: 'tomme', url: null },
      ],
    });
    await generateImages(id);

    expect(icons).toHaveBeenCalledTimes(1);
    // A renamed card loses its concept: the server draws its label.
    expect(icons.mock.calls[0][1]).toEqual([
      { label: 'Brie', concept: 'brie' },
      { label: 'Roquefort', concept: '' },
      { label: 'Tomme', concept: '' },
    ]);
    expect(byLabel('🧀 Brie').iconUrl).toBe('https://x/brie.png');
    expect(byLabel('🧀 Roquefort').iconUrl).toBe('https://x/roquefort.png');
    expect(byLabel('Tomme').iconUrl).toBeUndefined();
    expect(useAiJob.getState().job).toMatchObject({ kind: 'images', phase: 'done', cards: 3, icons: 2, failed: 1 });
    // Drawn cards don't need an image any more.
    expect(cardsNeedingImage(store().lists[id]).map((c) => c.label)).toEqual(['Tomme']);
  });

  it('keeps the cards when the images fail', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'], cardLabels: ['Truc'] });
    icons.mockRejectedValue(new Error('icon failed'));
    await generateImages(id);
    expect(Object.keys(store().lists[id].cards)).toHaveLength(1);
    expect(useAiJob.getState().job).toMatchObject({ kind: 'images', phase: 'done', failed: 1 });
  });
});
