import { fetchIconReplacements } from '../lib/api';
import { upgradeCardIcons } from '../lib/stickerIcons';
import { useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({ fetchIconReplacements: jest.fn() }));
jest.mock('../lib/aiIconFiles', () => ({ cacheAiIcon: jest.fn(), hasStickerBorder: (url: string) => url.endsWith('-sticker.png') }));

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

  it('asks nothing once every card has a sticker picture', async () => {
    const store = useTierStore.getState();
    const id = store.createList({ title: 'T', tierLabels: ['S'], cardLabels: ['Tomate'] });
    store.updateCard(id, Object.keys(useTierStore.getState().lists[id].cards)[0], { iconUrl: NEW });
    await upgradeCardIcons();
    expect(fetchReplacements).not.toHaveBeenCalled();
  });
});
