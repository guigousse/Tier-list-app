// deno test supabase/functions/ai-generate/refunds.test.ts
// Notifications signed by a chain shaped like Apple's (apple_chain_fixture.ts).
import { at, chain, signed } from "./apple_chain_fixture.ts";
import { consumptionInfo, readNotification, serverApiToken } from "./refunds.ts";

const BUNDLE = "com.guigousse.TierCraft";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
}

async function refused(promise: Promise<unknown>, reason: string) {
  try {
    await promise;
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes(reason)) throw new Error(`attendu « ${reason} », obtenu ${e}`);
    return;
  }
  throw new Error(`accepté alors qu'il fallait refuser (${reason})`);
}

async function notification(type: string, over: Record<string, unknown> = {}) {
  const c = await chain();
  const tx = await signed(c, { transactionId: "2000000999", productId: "tiercraft.energy.1750", bundleId: BUNDLE, type: "Consumable" });
  const payload = await signed(c, {
    notificationType: type,
    notificationUUID: "uuid-1",
    data: { bundleId: BUNDLE, environment: "Production", signedTransactionInfo: tx, consumptionRequestReason: "UNSATISFIED_WITH_PURCHASE", ...over },
  });
  return { payload, opts: { bundleId: BUNDLE, rootFingerprint: c.rootFingerprint, at } };
}

Deno.test("une notification d'Apple dit quel achat elle concerne, vérifiée jusqu'à la racine", async () => {
  const { payload, opts } = await notification("REFUND");
  same(await readNotification(payload, opts), { type: "REFUND", environment: "Production", transactionId: "2000000999", productId: "tiercraft.energy.1750" });
});

Deno.test("une notification d'une autre app ou mal signée est refusée", async () => {
  const other = await notification("REFUND", { bundleId: "com.autre.app" });
  await refused(readNotification(other.payload, other.opts), "app");
  const { payload } = await notification("REFUND");
  await refused(readNotification(payload, { bundleId: BUNDLE, at }), "root");
});

Deno.test("demande de remboursement : Apple apprend la part du pack déjà dépensée", () => {
  // Nothing spent: the player gets their money back, fair enough.
  same(consumptionInfo(360, 400), { customerConsented: true, consumptionPercentage: 0, deliveryStatus: "DELIVERED", refundPreference: "GRANT_FULL", sampleContentProvided: true });
  // Half spent: back only for what is left.
  same(consumptionInfo(360, 180), { customerConsented: true, consumptionPercentage: 50000, deliveryStatus: "DELIVERED", refundPreference: "GRANT_PRORATED", sampleContentProvided: true });
  // All spent: the generations were made and paid for, refund declined.
  same(consumptionInfo(360, 0), { customerConsented: true, consumptionPercentage: 100000, deliveryStatus: "DELIVERED", refundPreference: "DECLINE", sampleContentProvided: true });
});

Deno.test("le jeton de l'API App Store Server est signé par la clé d'achats intégrés", async () => {
  const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keys.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...pkcs8))}\n-----END PRIVATE KEY-----`;
  const token = await serverApiToken({ key: pem, keyId: "KEY123", issuerId: "issuer-1", bundleId: BUNDLE }, new Date("2026-10-15T12:00:00Z"));
  const [h, p, s] = token.split(".");
  const dec = (x: string) => JSON.parse(atob(x.replace(/-/g, "+").replace(/_/g, "/")));
  same(dec(h), { alg: "ES256", kid: "KEY123", typ: "JWT" });
  same(dec(p), { iss: "issuer-1", iat: 1792065600, exp: 1792065900, aud: "appstoreconnect-v1", bid: BUNDLE });
  const sig = Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, keys.publicKey, sig, new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new Error("signature invalide");
});
