import { fetchCardIcons, fetchDaily, fetchDiscovery, fetchPastDailies, fetchTemplateStats, fetchTemplates, fetchTranslations } from '../lib/api';
import { useTierStore } from '../store/useTierStore';
import { useCatalog } from '../store/useCatalog';

jest.mock('../lib/api', () => ({
  fetchTemplates: jest.fn(),
  fetchDaily: jest.fn(),
  fetchTemplateStats: jest.fn(),
  fetchPastDailies: jest.fn(),
  fetchDiscovery: jest.fn(),
  fetchCardIcons: jest.fn(),
  fetchListTops: jest.fn(async () => ({ fruits: 2 })),
  fetchTranslations: jest.fn(async (lang: string) => ({ lang, template: { fruits: { title: `Fruits ${lang}` } }, daily: {} })),
}));

const answer = () => {
  (fetchTemplates as jest.Mock).mockResolvedValue([{ key: 'fruits', title: 'Fruits', emoji: '🍎', items: ['Pomme'] }]);
  (fetchDaily as jest.Mock).mockResolvedValue({ day: '2026-10-17', title: 'Jour', emoji: '☀️', items: ['A'] });
  (fetchTemplateStats as jest.Mock).mockResolvedValue({ fruits: { completions: 3, favorites: 1 } });
  (fetchPastDailies as jest.Mock).mockResolvedValue([]);
  (fetchDiscovery as jest.Mock).mockResolvedValue({ tags: {}, trends: {} });
  (fetchCardIcons as jest.Mock).mockResolvedValue({ kiwi: 'https://x/kiwi.png' });
};

describe('refreshing the catalogue when the app comes back', () => {
  it('changes nothing, and wakes no screen, when the server says the same', async () => {
    answer();
    await useCatalog.getState().refresh();
    const before = useCatalog.getState();
    const changes = jest.fn();
    const unsubscribe = useCatalog.subscribe(changes);
    answer();
    await useCatalog.getState().refresh();
    unsubscribe();
    expect(changes).not.toHaveBeenCalled();
    expect(useCatalog.getState().templates).toBe(before.templates);
  });

  it('takes what changed', async () => {
    answer();
    await useCatalog.getState().refresh();
    (fetchTemplateStats as jest.Mock).mockResolvedValue({ fruits: { completions: 4, favorites: 1 } });
    const templates = useCatalog.getState().templates;
    await useCatalog.getState().refresh();
    expect(useCatalog.getState().stats.fruits.completions).toBe(4);
    expect(useCatalog.getState().templates).toBe(templates);
  });

  it('asks the library images of the cards of every public list, published ones included', async () => {
    answer();
    (fetchTemplates as jest.Mock).mockResolvedValue([{ key: 'x', title: 'X', emoji: '🍎', items: ['Kiwi'], concepts: ['kiwi-online'] }]);
    await useCatalog.getState().refresh();
    const asked = (fetchCardIcons as jest.Mock).mock.calls.at(-1)[0] as string[];
    expect(asked).toContain('kiwi-online');
    expect(new Set(asked).size).toBe(asked.length);
    expect(useCatalog.getState().icons).toEqual({ kiwi: 'https://x/kiwi.png' });
  });
});

describe('translations of the online content', () => {
  afterEach(() => useTierStore.getState().updateSettings({ language: 'auto' }));

  it('are not asked in French, the language the content is written in', async () => {
    answer();
    (fetchTranslations as jest.Mock).mockClear();
    await useCatalog.getState().refresh();
    expect(fetchTranslations).not.toHaveBeenCalled();
  });

  it('are fetched in the player’s language and kept for offline', async () => {
    answer();
    useTierStore.getState().updateSettings({ language: 'el' });
    await useCatalog.getState().refresh();
    expect(fetchTranslations).toHaveBeenCalledWith('el');
    expect(useCatalog.getState().translations?.template.fruits.title).toBe('Fruits el');
  });
});
