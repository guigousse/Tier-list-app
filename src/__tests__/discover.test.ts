import type { Template } from '../constants/presets';
import { forYou, trending, type Discovery } from '../lib/discover';

const t = (key: string): Template => ({ key, title: key, emoji: '', items: [] });
const lists = ['pizza', 'burger', 'paris', 'rome', 'jedi', 'cheese'].map(t);
const discovery: Discovery = {
  tags: {
    pizza: ['food', 'savory', 'fast-food'],
    burger: ['food', 'savory', 'fast-food'],
    cheese: ['food', 'savory', 'france'],
    paris: ['travel', 'france'],
    rome: ['travel', 'culture'],
    jedi: ['movies', 'pop-culture'],
  },
  trends: { jedi: 9, rome: 4, pizza: 1 },
};
const keys = (ts: Template[]) => ts.map((x) => x.key);
const none = () => 0;

describe('trending', () => {
  it('ranks by recent activity, lists already done last', () => {
    expect(keys(trending(lists, discovery, none, () => false)).slice(0, 3)).toEqual(['jedi', 'rome', 'pizza']);
    expect(keys(trending(lists, discovery, none, (x) => x.key === 'jedi')).at(-1)).toBe('jedi');
  });
});

describe('for you', () => {
  it('suggests lists sharing themes with the ones completed', () => {
    const done = (x: Template) => x.key === 'pizza';
    const result = keys(forYou(lists, discovery, none, done, []));
    expect(result[0]).toBe('burger');
    expect(result[1]).toBe('cheese');
    expect(result.at(-1)).toBe('pizza');
  });

  it('learns from favourites too, and falls back on trends without history', () => {
    expect(keys(forYou(lists, discovery, none, () => false, ['paris']))[0]).toBe('paris');
    expect(keys(forYou(lists, discovery, none, () => false, []))).toEqual(keys(trending(lists, discovery, none, () => false)));
  });
});
