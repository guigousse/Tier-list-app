/**
 * The picture of a ranking shared on social networks (src/components/ShareCard.tsx): a
 * 9:16 story, 360 × 640 points captured at 3× (1080 × 1920). The ranking gets the space
 * between the title and the Tiercraft band; its cards are as big as that space allows.
 */
export const SHARE_CARD = {
  width: 360,
  height: 640,
  /** Width left to the cards of a tier, beside its label. */
  boardWidth: 360 - 2 * 20 - 52 - 8,
  /** Height left to the ranking between the header and the watermark band. */
  boardHeight: 380,
  gap: 4,
  /** Between two tiers. */
  rowGap: 3,
  maxCard: 56,
  minCard: 22,
};

/** The largest card size (points) that shows every card of every tier in the picture. */
export function fitCards(perTier: number[]): number {
  const fits = (size: number) => {
    const perRow = Math.max(1, Math.floor((SHARE_CARD.boardWidth + SHARE_CARD.gap) / (size + SHARE_CARD.gap)));
    const height = perTier.reduce((sum, n) => sum + Math.max(1, Math.ceil(n / perRow)) * (size + SHARE_CARD.gap) + SHARE_CARD.gap, 0);
    return height + (perTier.length - 1) * SHARE_CARD.rowGap <= SHARE_CARD.boardHeight;
  };
  for (let size = SHARE_CARD.maxCard; size > SHARE_CARD.minCard; size--) if (fits(size)) return size;
  return SHARE_CARD.minCard;
}
