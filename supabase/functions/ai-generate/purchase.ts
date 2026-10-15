// Energy packs bought in the App Store. The iPhone hands over the transaction signed by
// Apple (StoreKit 2's jwsRepresentation); it is checked here, link by link up to Apple's
// root, before a single credit is added: the app can't make up a purchase, and the
// database credits each transaction only once (wallet_purchase).
import { p256 } from "npm:@noble/curves@1.9.7/p256";
import * as x509 from "npm:@peculiar/x509@1.14.3";

import { ecKey, signedBy } from "./certs.ts";

/**
 * The packs (docs/monetization-plan.md): a 0.99 € way in, then more credits per euro the
 * bigger the pack. Net of 20 % VAT and Apple's 15 %, even the biggest leaves ≈ 0.81 c€ a
 * credit, above the ≈ 0.73 c€ a credit costs us at worst in normal use (10 new images).
 */
export const PACKS: Record<string, { credits: number; price: number }> = {
  "tiercraft.energy.60": { credits: 60, price: 0.99 },
  "tiercraft.energy.200": { credits: 200, price: 2.99 },
  "tiercraft.energy.360": { credits: 360, price: 4.99 },
  "tiercraft.energy.800": { credits: 800, price: 9.99 },
  "tiercraft.energy.1750": { credits: 1750, price: 19.99 },
};

/** SHA-256 of Apple Root CA - G3, which every App Store signature leads to. */
export const APPLE_ROOT_G3 = "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";
/** Marks Apple puts on the certificates of its WWDR intermediate and of StoreKit's signer. */
const WWDR_OID = "1.2.840.113635.100.6.2.1";
const STOREKIT_OID = "1.2.840.113635.100.6.11.1";

const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

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
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("invalid transaction");
  let header: { alg?: string; x5c?: string[] }, payload: Record<string, unknown>;
  try {
    header = JSON.parse(new TextDecoder().decode(fromB64url(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
  } catch {
    throw new Error("invalid transaction");
  }
  if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length !== 3) throw new Error("invalid transaction");

  // 1. Signer, Apple's intermediate, Apple's root: each signed by the next.
  let leaf: x509.X509Certificate, ca: x509.X509Certificate, root: x509.X509Certificate;
  try {
    [leaf, ca, root] = header.x5c.map((c) => new x509.X509Certificate(c));
  } catch {
    throw new Error("invalid certificate");
  }
  if (hex(await crypto.subtle.digest("SHA-256", root.rawData)) !== (opts.rootFingerprint ?? APPLE_ROOT_G3)) throw new Error("not Apple's root");
  if (!ca.getExtension(WWDR_OID) || !leaf.getExtension(STOREKIT_OID)) throw new Error("not a StoreKit certificate");
  const date = opts.at ?? new Date();
  if (!(await signedBy(ca, root, date)) || !(await signedBy(leaf, ca, date))) throw new Error("certificate chain");

  // 2. The transaction itself, signed by the leaf's P-256 key (r ‖ s, 64 bytes).
  const key = ecKey(leaf);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${parts[0]}.${parts[1]}`)));
  let valid = false;
  try {
    valid = key?.curve === p256 && p256.verify(fromB64url(parts[2]), digest, key.point, { prehash: false, lowS: false, format: "compact" });
  } catch {
    valid = false;
  }
  if (!valid) throw new Error("signature does not match");

  // 3. What was bought: one of our packs, by this app, not refunded.
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
