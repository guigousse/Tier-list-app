/**
 * The picture of a ranking shared on social networks (src/components/ShareCard.tsx): a
 * 9:16 story, 360 × 640 points captured at 3× (1080 × 1920). The ranking gets the space
 * between the title and the Tiercraft band; its cards are as big as that space allows.
 */
export const SHARE_CARD = {
  width: 360,
  height: 640,
  /** A tier's label: wide enough for a word like « Délicieux » at a readable size. */
  labelWidth: 64,
  /** Width left to the cards of a tier, beside its label. */
  boardWidth: 360 - 2 * 20 - 64 - 8,
  /**
   * Height left to the ranking, measured on a capture: 376 between a two-line title and
   * the band, less the agreement line (about 24) when it shows.
   */
  boardHeight: 350,
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

/**
 * The font size of a tier's label: its longest word on one line (a word broken in the
 * middle, « Délici / eux », read badly on the first capture). Computed rather than
 * `adjustsFontSizeToFit`, which only iOS honours.
 */
export function labelFontSize(label: string): number {
  const longest = Math.max(1, ...label.split(/\s+/).map((w) => w.length));
  return Math.max(8, Math.min(15, Math.floor((SHARE_CARD.labelWidth - 8) / (longest * 0.62))));
}
