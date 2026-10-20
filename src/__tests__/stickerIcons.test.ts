import { fetchIconReplacements } from '../lib/api';
import { upgradeCardIcons } from '../lib/stickerIcons';
import { useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({ fetchIconReplacements: jest.fn() }));
jest.mock('../lib/aiIconFiles', () => ({ cacheAiIcon: jest.fn() }));

const fetchReplacements = fetchIconReplacements as jest.Mock;
const OLD = 'https://x/card-icons/tomato-a.png';
const NEW = 'https://x/card-icons/tomato-b-sticker.png';

beforeEach(() => {
  jest.clearAllMocks();
  useTierStore.setState({ lists: {} });
});

describe('cards moving to the sticker pictures', () => {
  it('take the new picture of their library image, without counting the list as changed', async () => {
    const store = useTierStore.getState();
    const id = store.createList({ title: 'T', tierLabels: ['S'], cardLabels: ['Tomate', 'Photo'] });
    const [tomato, photo] = Object.keys(useTierStore.getState().lists[id].cards);
    store.updateCard(id, tomato, { iconUrl: OLD });
    const before = useTierStore.getState().lists[id].updatedAt;
    fetchReplacements.mockResolvedValueOnce({ [OLD]: NEW });

    await upgradeCardIcons();

    expect(fetchReplacements).toHaveBeenCalledWith([OLD]);
    const list = useTierStore.getState().lists[id];
    expect(list.cards[tomato].iconUrl).toBe(NEW);
    expect(list.cards[photo].iconUrl).toBeUndefined();
    expect(list.updatedAt).toBe(before);
  });

  it('also move off a sticker picture redrawn since', async () => {
    const store = useTierStore.getState();
    const id = store.createList({ title: 'T', tierLabels: ['S'], cardLabels: ['Tomate'] });
    const tomato = Object.keys(useTierStore.getState().lists[id].cards)[0];
    store.updateCard(id, tomato, { iconUrl: NEW });
    const REDRAWN = 'https://x/card-icons/tomato-c-sticker.png';
    fetchReplacements.mockResolvedValueOnce({ [NEW]: REDRAWN });
    await upgradeCardIcons();
    expect(fetchReplacements).toHaveBeenCalledWith([NEW]);
    expect(useTierStore.getState().lists[id].cards[tomato].iconUrl).toBe(REDRAWN);
  });

  it('asks nothing when no card has a library picture', async () => {
    const store = useTierStore.getState();
    const id = store.createList({ title: 'T', tierLabels: ['S'], cardLabels: ['Tomate'] });
    store.updateCard(id, Object.keys(useTierStore.getState().lists[id].cards)[0], { iconUrl: 'file:///photo.png' });
    await upgradeCardIcons();
    expect(fetchReplacements).not.toHaveBeenCalled();
  });
});
