// Energy packs bought in the App Store. The iPhone hands over the transaction signed by
// Apple (StoreKit 2's jwsRepresentation); it is checked here, link by link up to Apple's
// root, before a single credit is added: the app can't make up a purchase, and the
// database credits each transaction only once (wallet_purchase).
import { verifyAppleJws } from "./appleJws.ts";

export { APPLE_ROOT_G3 } from "./appleJws.ts";

/**
 * The packs (docs/monetization-plan.md): a 0.99 € way in, then more credits per euro the
 * bigger the pack. Net of 20 % VAT and Apple's 15 %, even the biggest leaves ≈ 0.81 c€ a
 * credit, above the ≈ 0.65 c€ a credit costs us at worst in normal use (3 new images).
 */
export const PACKS: Record<string, { credits: number; price: number }> = {
  "tiercraft.energy.60": { credits: 60, price: 0.99 },
  "tiercraft.energy.200": { credits: 200, price: 2.99 },
  "tiercraft.energy.360": { credits: 360, price: 4.99 },
  "tiercraft.energy.800": { credits: 800, price: 9.99 },
  "tiercraft.energy.1750": { credits: 1750, price: 19.99 },
};

export type Purchase = { transactionId: string; productId: string; credits: number; environment: string };

/**
 * Checks a signed transaction from StoreKit for the app `bundleId` and returns what it
 * gives. Throws with the reason when anything doesn't hold. Sandbox transactions are
 * accepted: TestFlight and Apple's own review only ever buy in the sandbox.
 */
export async function verifyTransaction(
  jws: string,
  opts: { bundleId: string; rootFingerprint?: string; at?: Date },
): Promise<Purchase> {
  const payload = await verifyAppleJws(jws, opts);

  // What was bought: one of our packs, by this app, not refunded.
  if (payload.bundleId !== opts.bundleId) throw new Error("app does not match");
  if (payload.revocationDate) throw new Error("revoked");
  const productId = String(payload.productId ?? "");
  const pack = PACKS[productId];
  if (!pack || payload.type !== "Consumable") throw new Error("unknown product");
  const quantity = Math.max(1, Math.floor(Number(payload.quantity) || 1));
  const transactionId = String(payload.transactionId ?? "");
  if (!transactionId) throw new Error("invalid transaction");
  return { transactionId, productId, credits: pack.credits * quantity, environment: String(payload.environment ?? "") };
}
