import type { DailyList } from '../lib/api';
import { useTierStore } from '../store/useTierStore';

const daily: DailyList = {
  day: '2026-10-20',
  title: 'Desserts de Noël',
  emoji: '🎄',
  items: ['🪵 Bûche', '🍪 Sablés', '🍊 Clémentines'],
  concepts: ['yule-log', 'cookie', 'orange-fruit'],
  cover: 0,
};
const icons = { 'yule-log': 'https://x/card-icons/yule-log-sticker.png', cookie: 'https://x/card-icons/cookie-sticker.png' };

beforeEach(() => useTierStore.setState({ lists: {} }));

const cardsOf = (id: string) => {
  const list = useTierStore.getState().lists[id];
  return list.daily!.cardIds.map((c) => list.cards[c].iconUrl);
};

describe('the images of a daily tier list', () => {
  it('come with the cards when the list is played', () => {
    const id = useTierStore.getState().createDailyList(daily, icons);
    expect(cardsOf(id)).toEqual([icons['yule-log'], icons.cookie, undefined]);
  });

  it('reach a copy made before they were drawn, without counting it as changed', () => {
    const store = useTierStore.getState();
    const id = store.createDailyList(daily);
    const before = useTierStore.getState().lists[id].updatedAt;
    store.syncDailyIcons([daily], icons);
    expect(cardsOf(id)).toEqual([icons['yule-log'], icons.cookie, undefined]);
    expect(useTierStore.getState().lists[id].updatedAt).toBe(before);
  });

  it('leave a card with a picture of its own as it is', () => {
    const store = useTierStore.getState();
    const id = store.createDailyList(daily);
    const first = useTierStore.getState().lists[id].daily!.cardIds[0];
    store.updateCard(id, first, { iconUrl: 'https://x/mine.png' });
    store.syncDailyIcons([daily], icons);
    expect(cardsOf(id)[0]).toBe('https://x/mine.png');
  });

  it('nothing to add leaves the lists as they are', () => {
    const store = useTierStore.getState();
    store.createDailyList(daily);
    const lists = useTierStore.getState().lists;
    store.syncDailyIcons([{ ...daily, concepts: undefined }], icons);
    expect(useTierStore.getState().lists).toBe(lists);
  });
});
