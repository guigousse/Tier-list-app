import { cardPreview } from '../lib/cardPreview';
import type { Card } from '../store/types';

const card: Card = { id: 'c1', label: '🌹 Rose', color: '#2B2F3A', iconUrl: 'https://x/rose.png', aiConcept: 'rose-flower' };

describe('card preview in the edit sheet', () => {
  it('shows the AI image of the card, not its emoji', () => {
    const p = cardPreview(card, { label: '🌹 Rose', color: '#2B2F3A' });
    expect(p.iconUrl).toBe('https://x/rose.png');
  });

  it('a photo picked meanwhile comes first, and a removed AI image is gone', () => {
    expect(cardPreview(card, { label: 'Rose', color: '#000', imageName: 'p.jpg' }).imageName).toBe('p.jpg');
    const removed = cardPreview(card, { label: 'Rose', color: '#000', iconRemoved: true });
    expect(removed.iconUrl).toBeUndefined();
    expect(removed.iconSvg).toBeUndefined();
  });

  it('a new card has no image yet', () => {
    expect(cardPreview(null, { label: '', color: '#000' })).toEqual({ id: 'preview', label: '?', color: '#000' });
  });
});
