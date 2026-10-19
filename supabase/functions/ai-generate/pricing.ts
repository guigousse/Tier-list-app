// What the AI costs the player, in credits (1 credit ≈ 1 cent; docs/monetization-plan.md).
// The server alone decides: the app shows the same scale, but never sends a price.

/**
 * Text (cards written or replaced, tiers renamed) costs 3 credits a generation, whatever
 * the count: a single AI call writes it all and its cost hardly depends on how many.
 * Measured on 2026-10-16, 12 cards with 166 concepts in the library hint: ≈ 0.9 ¢ $ on
 * Sonnet 5.5 (cards), ≈ 1.8 ¢ $ on Opus 5.5; at 20 cards and a full hint (500 concepts)
 * ≈ 1.5 ¢ $ on Sonnet. 3 credits net ≥ 2.4 c€ (biggest pack): above the worst case.
 */
export const CREDITS = { text: 3, sheet: 8, image: 1 } as const;

/**
 * Credits given once to a wallet opened from a genuine iPhone (App Attest): one list of
 * 10 cards with their images (21), so a new player sees the whole thing work.
 */
export const WELCOME_BONUS = 30;

export type Paid = "words" | "tiers" | "images";

/**
 * Price of what was delivered: text written, images received. A sheet
 * costs the same for 3 icons or 20 (≈ 6 c€ at Gemini), so images pay a fixed part
 * plus a little each: measured, a 5-card illustrated list pays for itself even when no
 * icon was in the library yet. Nothing delivered, nothing to pay, fixed part included.
 */
export function charge(kind: Paid, delivered: number): number {
  if (delivered <= 0) return 0;
  if (kind === "words" || kind === "tiers") return CREDITS.text;
  return CREDITS.sheet + delivered * CREDITS.image;
}
