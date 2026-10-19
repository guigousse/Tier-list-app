// deno test supabase/functions/ai-generate/purchase.test.ts
// Signed by a chain shaped like Apple's (apple_chain_fixture.ts).
import { at, chain, signed, text64 } from "./apple_chain_fixture.ts";
import { PACKS, verifyTransaction } from "./purchase.ts";

const BUNDLE = "com.guigousse.TierCraft";

const purchase = (over: Record<string, unknown> = {}) => ({
  transactionId: "2000000123456789",
  originalTransactionId: "2000000123456789",
  bundleId: BUNDLE,
  productId: "tiercraft.energy.360",
  type: "Consumable",
  quantity: 1,
  environment: "Sandbox",
  ...over,
});

async function refused(promise: Promise<unknown>, reason: string) {
  try {
    await promise;
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes(reason)) throw new Error(`attendu « ${reason} », obtenu ${e}`);
    return;
  }
  throw new Error(`accepté alors qu'il fallait refuser (${reason})`);
}

Deno.test("les packs : un prix d'appel, puis de plus en plus de crédits par euro", () => {
  const ids = Object.keys(PACKS);
  if (ids.length !== 5) throw new Error(ids.join());
  const perEuro = ids.map((id) => PACKS[id].credits / PACKS[id].price);
  for (let i = 1; i < perEuro.length; i++) if (perEuro[i] <= perEuro[i - 1]) throw new Error(`pas dégressif : ${perEuro}`);
  // Net after 20 % VAT and Apple's 15 %: above 0.73 c€ a credit, the most a credit can
  // cost us in normal use (10 new images, cards without concept), for every pack.
  for (const id of ids) {
    const net = (PACKS[id].price / 1.2) * 0.85 * 100;
    if (net / PACKS[id].credits < 0.73 * 1.1) throw new Error(`${id} pas assez rentable : ${net / PACKS[id].credits}`);
  }
});

Deno.test("un achat signé par la chaîne d'Apple est accepté, avec ses crédits", async () => {
  const c = await chain();
  const r = await verifyTransaction(await signed(c, purchase()), { bundleId: BUNDLE, rootFingerprint: c.rootFingerprint, at });
  if (r.transactionId !== "2000000123456789" || r.productId !== "tiercraft.energy.360" || r.credits !== 360 || r.environment !== "Sandbox") {
    throw new Error(JSON.stringify(r));
  }
});

Deno.test("une autre racine que celle d'Apple est refusée", async () => {
  const c = await chain();
  await refused(verifyTransaction(await signed(c, purchase()), { bundleId: BUNDLE, at }), "root");
});

Deno.test("une signature qui ne correspond pas au contenu est refusée", async () => {
  const c = await chain();
  const jws = await signed(c, purchase());
  const [h, , s] = jws.split(".");
  await refused(verifyTransaction(`${h}.${text64(purchase({ productId: "tiercraft.energy.1750" }))}.${s}`, { bundleId: BUNDLE, rootFingerprint: c.rootFingerprint, at }), "signature");
});

Deno.test("un certificat sans la marque StoreKit d'Apple est refusé", async () => {
  const c = await chain({ leafOid: false });
  await refused(verifyTransaction(await signed(c, purchase()), { bundleId: BUNDLE, rootFingerprint: c.rootFingerprint, at }), "certificate");
});

Deno.test("un intermédiaire qui n'est pas signé par la racine est refusé", async () => {
  const c = await chain();
  const other = await chain();
  await refused(verifyTransaction(await signed(c, purchase(), [c.leaf, c.ca, other.root]), { bundleId: BUNDLE, rootFingerprint: other.rootFingerprint, at }), "chain");
});

Deno.test("un achat d'une autre app, d'un produit inconnu ou remboursé ne donne rien", async () => {
  const c = await chain();
  const opts = { bundleId: BUNDLE, rootFingerprint: c.rootFingerprint, at };
  await refused(verifyTransaction(await signed(c, purchase({ bundleId: "com.autre.app" })), opts), "app");
  await refused(verifyTransaction(await signed(c, purchase({ productId: "tiercraft.energy.999999" })), opts), "product");
  await refused(verifyTransaction(await signed(c, purchase({ revocationDate: 1792000000000 })), opts), "revoked");
});

Deno.test("plusieurs exemplaires d'un pack donnent autant de fois ses crédits", async () => {
  const c = await chain();
  const r = await verifyTransaction(await signed(c, purchase({ productId: "tiercraft.energy.60", quantity: 3 })), { bundleId: BUNDLE, rootFingerprint: c.rootFingerprint, at });
  if (r.credits !== 180) throw new Error(JSON.stringify(r));
});
