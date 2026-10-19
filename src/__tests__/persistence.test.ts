import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveOnLeave, useTierStore } from '../store/useTierStore';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const saved = async () => JSON.parse((await AsyncStorage.getItem('tiercraft-store'))!).state;

describe('saving the tier lists', () => {
  it('a burst of moves is written once, with the last state', async () => {
    const id = useTierStore.getState().createList({ title: 'T', tierLabels: ['S', 'A'], cardLabels: Array.from({ length: 12 }, (_, i) => `C${i}`) });
    await wait(500);
    const writes = jest.spyOn(AsyncStorage, 'setItem');
    // Already a mock (jest.setup.js): its earlier calls are forgotten first.
    writes.mockClear();
    const list = useTierStore.getState().lists[id];
    for (const card of Object.keys(list.cards).slice(0, 10)) useTierStore.getState().moveCard(id, card, list.tiers[0].id, 0);
    await wait(500);
    // Measured before: 10 writes of the whole save for these 10 moves.
    expect(writes.mock.calls.filter(([key]) => key === 'tiercraft-store').length).toBe(1);
    const tier = list.tiers[0].id;
    expect((await saved()).lists[id].placement[tier]).toEqual(useTierStore.getState().lists[id].placement[tier]);
    expect(useTierStore.getState().lists[id].placement[tier]).toHaveLength(10);
  });

  it('leaving the app writes at once what is waiting', async () => {
    const id = useTierStore.getState().createList({ title: 'Avant de partir', tierLabels: ['S'], cardLabels: [] });
    await saveOnLeave('background');
    expect((await saved()).lists[id].title).toBe('Avant de partir');
  });
});
