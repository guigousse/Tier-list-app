// What the AI costs the player, in credits (1 credit ≈ 1 cent; docs/monetization-plan.md).
// The server alone decides: the app shows the same scale, but never sends a price.

export const CREDITS = { word: 1, tier: 1, sheet: 8, image: 1 } as const;

/**
 * Cards written in one generation are paid 5 at most: a single Opus call writes them all,
 * and its cost hardly depends on how many (≈ 0.8 ¢ $ for 1 card, ≈ 1.7 ¢ $ for 20 with
 * today's library, ≈ 2.3 ¢ $ once the hint lists 500 concepts). 5 credits net ≥ 4 c€.
 */
export const WORDS_CAP = 5;

/**
 * Credits given once to a wallet opened from a genuine iPhone (App Attest): one list of
 * 10 cards with their images (28), so a new player sees the whole thing work.
 */
export const WELCOME_BONUS = 30;

export type Paid = "words" | "tiers" | "images";

/**
 * Price of what was delivered: cards written, tiers renamed, images received. A sheet
 * costs the same for 3 icons or 20 (≈ 6 c€ at Gemini), so images pay a fixed part
 * plus a little each: measured, a 5-card illustrated list pays for itself even when no
 * icon was in the library yet. Nothing delivered, nothing to pay, fixed part included.
 */
export function charge(kind: Paid, delivered: number): number {
  if (delivered <= 0) return 0;
  if (kind === "words") return Math.min(delivered, WORDS_CAP) * CREDITS.word;
  if (kind === "tiers") return delivered * CREDITS.tier;
  return CREDITS.sheet + delivered * CREDITS.image;
}
