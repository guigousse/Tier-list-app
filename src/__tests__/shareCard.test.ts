import { fitCards, labelFontSize, SHARE_CARD } from '../lib/shareCard';

// Room for the ranking inside the 9:16 picture (src/components/ShareCard.tsx).
const rowsFit = (perTier: number[], size: number) => {
  const perRow = Math.floor((SHARE_CARD.boardWidth + SHARE_CARD.gap) / (size + SHARE_CARD.gap));
  const height = perTier.reduce((sum, n) => sum + Math.max(1, Math.ceil(n / perRow)) * (size + SHARE_CARD.gap) + SHARE_CARD.gap, 0);
  return height + (perTier.length - 1) * SHARE_CARD.rowGap <= SHARE_CARD.boardHeight;
};

describe('the cards of a shared ranking', () => {
  it('as big as the picture allows, every card shown', () => {
    for (const perTier of [[1, 1, 1, 1, 1], [3, 3, 2, 2, 2], [20, 0, 0, 0, 0], [5, 5, 4, 3, 3], [8, 4, 4, 2, 2], [4, 4, 4, 4, 4, 4, 4, 4]]) {
      const size = fitCards(perTier);
      expect(rowsFit(perTier, size)).toBe(true);
      // Not smaller than needed: one point bigger would not fit (or the largest size is reached).
      expect(size === SHARE_CARD.maxCard || !rowsFit(perTier, size + 1)).toBe(true);
    }
  });

  it('a few cards stay a readable size, not giant', () => {
    expect(fitCards([1, 1, 0, 0, 0])).toBe(SHARE_CARD.maxCard);
  });
});

describe('the label of a tier in the picture', () => {
  it('a short label keeps the full size', () => {
    expect(labelFontSize('S')).toBe(15);
  });

  it('a long word shrinks so it never breaks in the middle', () => {
    for (const label of ['Délicieux', 'Correct', 'Incroyable', 'Immangeable']) {
      const size = labelFontSize(label);
      // Bold glyphs average about 0.62 em: the longest word fits the label's inner width.
      expect(Math.max(...label.split(/\s+/).map((w) => w.length)) * size * 0.62).toBeLessThanOrEqual(SHARE_CARD.labelWidth - 8);
      expect(size).toBeGreaterThanOrEqual(8);
    }
  });
});
