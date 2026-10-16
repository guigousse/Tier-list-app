import { cardsNeedingImage, generateImages, generateTiers, generateWords, imageChoices, imageCredits, MIN_IMAGES, sheetSizes, tierCredits, useAiJob, wordCredits } from '../lib/aiGenerate';
import { ANTHRACITE } from '../constants/theme';
import { aiIcons, aiTiers, aiWords } from '../lib/api';
import { useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({
  aiWords: jest.fn(),
  aiIcons: jest.fn(),
  aiTiers: jest.fn(),
}));
jest.mock('../lib/aiIconFiles', () => ({ cacheAiIcon: jest.fn() }));
jest.mock('../lib/credits', () => ({
  walletForRequest: jest.fn(async () => 'secret-du-porte-monnaie'),
  setBalance: jest.fn(),
  creditsError: (e: unknown) => (e instanceof Error && e.message === 'credits' ? 'Pas assez de crédits pour cette génération.' : null),
}));

const words = aiWords as jest.Mock;
const icons = aiIcons as jest.Mock;
const tiers = aiTiers as jest.Mock;
const store = () => useTierStore.getState();
const WALLET = 'secret-du-porte-monnaie';

beforeEach(() => {
  useTierStore.setState({ lists: {} });
  useAiJob.setState({ job: null });
  words.mockReset();
  icons.mockReset();
  tiers.mockReset();
});

describe('AI generation', () => {
  it('writing cards costs 3 credits whatever their number, and images cost less each the more there are', () => {
    // One AI call writes them all: its cost hardly depends on the count (≈ 1 c€ for 1 card, ≈ 2 c€ for 20).
    expect(wordCredits(1)).toBe(3);
    expect(wordCredits(10)).toBe(3);
    expect(wordCredits(20)).toBe(3);
    expect(wordCredits(0)).toBe(0);
    // One drawing sheet for the whole list: a fixed part, then a little per image.
    expect(imageCredits(0)).toBe(0);
    // A sheet costs Gemini the same for 3 icons or 20: a fixed part, then 1 per image.
    expect(imageCredits(3)).toBe(11);
    expect(imageCredits(10)).toBe(18);
    expect(imageCredits(20)).toBe(28);
    expect(imageCredits(3) / 3).toBeGreaterThan(imageCredits(10) / 10);
  });

  it('splits more than 20 images into even sheets, each paying its fixed part', () => {
    expect(sheetSizes(3)).toEqual([3]);
    expect(sheetSizes(20)).toEqual([20]);
    // 13 + 13 rather than 20 + 6: same price, more room for each icon.
    expect(sheetSizes(26)).toEqual([13, 13]);
    expect(sheetSizes(41)).toEqual([14, 14, 13]);
    expect(imageCredits(26)).toBe(8 + 13 + 8 + 13);
  });

  it('draws all 26 selected cards, on two sheets of 13', async () => {
    const labels = Array.from({ length: 26 }, (_, i) => `Carte ${i + 1}`);
    const id = store().createList({ title: 'Grande liste', tierLabels: ['S'], cardLabels: labels });
    icons.mockImplementation(async (_d: string, _w: string, cards: { label: string }[]) => ({
      icons: cards.map((c) => ({ concept: c.label, url: `https://x/${encodeURIComponent(c.label)}.png` })),
      balance: 50,
    }));

    await generateImages(id, Object.keys(store().lists[id].cards));

    expect(icons.mock.calls.map((c) => c[2].length)).toEqual([13, 13]);
    expect(Object.values(store().lists[id].cards).every((c) => c.iconUrl)).toBe(true);
    expect(useAiJob.getState().job).toMatchObject({ phase: 'done', cards: 26, icons: 26, failed: 0 });
  });

  it('keeps the images of the sheet that came, when the other one fails', async () => {
    const labels = Array.from({ length: 22 }, (_, i) => `Carte ${i + 1}`);
    const id = store().createList({ title: 'T', tierLabels: ['S'], cardLabels: labels });
    icons
      .mockResolvedValueOnce({ icons: Array.from({ length: 11 }, (_, i) => ({ url: `https://x/${i}.png` })), balance: 10 })
      .mockRejectedValueOnce(new Error('credits'));

    await generateImages(id, Object.keys(store().lists[id].cards));

    expect(useAiJob.getState().job).toMatchObject({ phase: 'done', icons: 11, failed: 11, error: 'Pas assez de crédits pour cette génération.' });
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

    expect(words).toHaveBeenCalledWith(expect.any(String), WALLET, 'Fromages', 2, ['Comté']);
    expect(icons).not.toHaveBeenCalled();
    const list = store().lists[id];
    expect(list.title).toBe('Fromages');
    expect(Object.values(list.cards).map((c) => c.label)).toEqual(['Comté', '🧀 Brie', '🥐 Croissant']);
    expect(useAiJob.getState().job).toMatchObject({ kind: 'words', phase: 'done', cards: 2 });
  });

  it('gives the generated cards the anthracite background, under which every icon reads', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'] });
    words.mockResolvedValue({ cards: ['Rouge', 'Vert', 'Bleu'].map((label) => ({ label, emoji: '', concept: label })) });
    await generateWords(id, 'Couleurs', 3);
    expect(Object.values(store().lists[id].cards).map((c) => c.color)).toEqual([ANTHRACITE, ANTHRACITE, ANTHRACITE]);
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
    await generateImages(id, cardsNeedingImage(store().lists[id]).map((c) => c.id));

    expect(icons).toHaveBeenCalledTimes(1);
    // The list's theme tells which sense a homonym has (a pink "Rose" among colours).
    expect(icons.mock.calls[0][3]).toBe('Fromages');
    // A renamed card loses its concept: the server draws its label.
    expect(icons.mock.calls[0][2]).toEqual([
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

  it('draws only the cards the player selected, at least three', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'], cardLabels: ['Brie', 'Feta', 'Tomme', 'Gouda'] });
    const ids = Object.values(store().lists[id].cards).map((c) => c.id);
    expect(MIN_IMAGES).toBe(3);

    await generateImages(id, ids.slice(0, 2));
    expect(icons).not.toHaveBeenCalled();
    expect(useAiJob.getState().job).toBeNull();

    icons.mockResolvedValue({ icons: [{ url: 'https://x/1.png' }, { url: 'https://x/2.png' }, { url: 'https://x/3.png' }] });
    await generateImages(id, [ids[0], ids[2], ids[3]]);
    expect(icons.mock.calls[0][2].map((c: { label: string }) => c.label)).toEqual(['Brie', 'Tomme', 'Gouda']);
    expect(store().lists[id].cards[ids[1]].iconUrl).toBeUndefined();
  });

  it('keeps the cards when the images fail', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'], cardLabels: ['Truc', 'Bidule', 'Machin'] });
    icons.mockRejectedValue(new Error('icon failed'));
    await generateImages(id, Object.keys(store().lists[id].cards));
    expect(Object.keys(store().lists[id].cards)).toHaveLength(3);
    expect(useAiJob.getState().job).toMatchObject({ kind: 'images', phase: 'done', failed: 3 });
  });

  it('offers every card but the photos: the bare ones to draw, the illustrated ones to redraw', () => {
    const id = store().createList({ title: 'Couleurs', tierLabels: ['S'], cardLabels: ['Rouge', 'Vert'] });
    const [rouge, vert] = Object.values(store().lists[id].cards);
    store().updateCard(id, vert.id, { iconUrl: 'https://x/vert.png' });
    store().addCard(id, { label: 'Ma photo', color: '#000', imageName: 'p.jpg' });
    const { toDraw, toRedraw } = imageChoices(store().lists[id]);
    expect(toDraw.map((c) => c.id)).toEqual([rouge.id]);
    expect(toRedraw.map((c) => c.id)).toEqual([vert.id]);
  });

  it('redraws the illustrated cards picked: a new image, read again in the theme', async () => {
    const id = store().createList({ title: 'Couleurs', tierLabels: ['S'], cardLabels: ['Rouge', 'Vert', 'Rose'] });
    const [rouge, vert, rose] = Object.values(store().lists[id].cards);
    store().updateCard(id, rose.id, { iconUrl: 'https://x/flamingo.png', aiConcept: 'flamingo' });
    icons.mockResolvedValue({
      icons: [
        { concept: 'red-paint-splash', url: 'https://x/red.png' },
        { concept: 'green-paint-splash', url: 'https://x/green.png' },
        { concept: 'pink-paint-splash', url: 'https://x/pink.png' },
      ],
    });

    await generateImages(id, [rouge.id, vert.id, rose.id]);

    expect(icons.mock.calls[0][2]).toEqual([
      { label: 'Rouge', concept: '' },
      { label: 'Vert', concept: '' },
      // Its concept may be what was wrong (a flamingo for a colour): read again.
      { label: 'Rose', concept: '', redraw: true },
    ]);
    const after = store().lists[id].cards;
    expect(after[rose.id].iconUrl).toBe('https://x/pink.png');
    // The concept drawn is kept: the next redraw starts from it.
    expect(after[rose.id].aiConcept).toBe('pink-paint-splash');
  });

  it('never redraws a photo, even when asked', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'], cardLabels: ['A', 'B', 'C'] });
    const photo = store().addCard(id, { label: 'Photo', color: '#000', imageName: 'p.jpg' });
    icons.mockResolvedValue({ icons: [{ url: 'https://x/1.png' }, { url: 'https://x/2.png' }, { url: 'https://x/3.png' }] });
    await generateImages(id, Object.keys(store().lists[id].cards));
    expect(icons.mock.calls[0][2].map((c: { label: string }) => c.label)).toEqual(['A', 'B', 'C']);
    expect(photo).toBeDefined();
  });

  it('renames the tiers for 3 credits, like any text', () => {
    expect(tierCredits(5)).toBe(3);
    expect(tierCredits(1)).toBe(3);
    expect(tierCredits(0)).toBe(0);
  });

  it('renames the tiers in the tone chosen, best first, tied to the theme and the cards', async () => {
    const id = store().createList({ title: 'Ma liste', tierLabels: ['S', 'A', 'B'], cardLabels: ['🧀 Comté', 'Brie'] });
    tiers.mockResolvedValue({ labels: ['Grand cru', 'Bien affiné', 'Bof'] });

    await generateTiers(id, 'Fromages', 'humour');

    // The cards say what the theme is really about ("Fromages" of a region, of a shop…).
    expect(tiers).toHaveBeenCalledWith(expect.any(String), WALLET, 'Fromages', ['S', 'A', 'B'], 'humour', ['Comté', 'Brie']);
    expect(store().lists[id].tiers.map((t) => t.label)).toEqual(['Grand cru', 'Bien affiné', 'Bof']);
    // Renaming the tiers leaves the list's title and cards alone.
    expect(store().lists[id].title).toBe('Ma liste');
    expect(useAiJob.getState().job).toMatchObject({ kind: 'tiers', phase: 'done', tiers: 3 });
  });

  it('keeps a tier name the AI left out', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S', 'A', 'B'] });
    tiers.mockResolvedValue({ labels: ['Top', ''] });
    await generateTiers(id, 'Fromages', 'fantaisiste');
    expect(store().lists[id].tiers.map((t) => t.label)).toEqual(['Top', 'A', 'B']);
  });

  it('says why when the tiers could not be renamed', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S', 'A'] });
    tiers.mockRejectedValue(new Error('quota'));
    await generateTiers(id, 'Fromages', 'serieux');
    expect(store().lists[id].tiers.map((t) => t.label)).toEqual(['S', 'A']);
    expect(useAiJob.getState().job).toMatchObject({ kind: 'tiers', phase: 'error' });
  });

  it('replaces the cards picked with new words, in place, and adds the others', async () => {
    const id = store().createList({ title: 'Fromages', tierLabels: ['S', 'A'], cardLabels: ['🧀 Comté', '🧀 Gouda', '🧀 Brie'] });
    const [comte, gouda] = Object.values(store().lists[id].cards);
    store().moveCard(id, gouda.id, store().lists[id].tiers[0].id);
    store().updateCard(id, gouda.id, { iconUrl: 'https://x/gouda.png', aiConcept: 'gouda-wheel', color: '#123456' });
    words.mockResolvedValue({
      cards: [
        { label: 'Roquefort', emoji: '🧀', concept: 'roquefort' },
        { label: 'Feta', emoji: '🧀', concept: 'feta-block' },
      ],
    });

    await generateWords(id, 'Fromages', 1, [gouda.id]);

    // One call for both: the AI knows every card, the replaced one included, to avoid it.
    expect(words).toHaveBeenCalledWith(expect.any(String), WALLET, 'Fromages', 2, ['🧀 Comté', '🧀 Gouda', '🧀 Brie']);
    const after = store().lists[id];
    const replaced = after.cards[gouda.id];
    expect(replaced.label).toBe('🧀 Roquefort');
    expect(replaced.aiConcept).toBe('roquefort');
    // Its picture showed the old word: gone, the images tab will draw the new one.
    expect(replaced.iconUrl).toBeUndefined();
    expect(replaced.color).toBe('#123456');
    expect(after.placement[after.tiers[0].id]).toContain(gouda.id);
    expect(Object.values(after.cards).map((c) => c.label)).toEqual(['🧀 Comté', '🧀 Roquefort', '🧀 Brie', '🧀 Feta']);
    expect(after.cards[comte.id].label).toBe('🧀 Comté');
    expect(useAiJob.getState().job).toMatchObject({ kind: 'words', phase: 'done', cards: 1, replaced: 1 });
  });

  it('can replace cards without adding any, for the same 3 credits', async () => {
    const id = store().createList({ title: 'T', tierLabels: ['S'], cardLabels: ['A', 'B'] });
    const [a] = Object.values(store().lists[id].cards);
    words.mockResolvedValue({ cards: [{ label: 'C', emoji: '', concept: 'c' }, { label: 'D', emoji: '', concept: 'd' }, { label: 'E', emoji: '', concept: 'e' }] });
    // Added and replaced cards come in the same call: one price for both.
    expect(wordCredits(0, 1)).toBe(3);
    expect(wordCredits(5, 2)).toBe(3);
    await generateWords(id, 'Lettres', 0, [a.id]);
    // The server sends at least 3: only what was asked is kept.
    expect(Object.values(store().lists[id].cards).map((c) => c.label)).toEqual(['C', 'B']);
  });

  it('shows the balance the server sends back, and says when credits are short', async () => {
    const { setBalance } = jest.requireMock('../lib/credits');
    const id = store().createList({ title: 'T', tierLabels: ['S'] });
    words.mockResolvedValue({ cards: [{ label: 'Brie', emoji: '🧀', concept: 'brie' }], balance: 41 });
    await generateWords(id, 'Fromages', 1);
    expect(setBalance).toHaveBeenCalledWith(41);

    words.mockRejectedValue(new Error('credits'));
    await generateWords(id, 'Fromages', 5);
    expect(useAiJob.getState().job).toMatchObject({ phase: 'error', error: 'Pas assez de crédits pour cette génération.' });
  });
});
