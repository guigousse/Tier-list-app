// deno test supabase/functions/ai-generate/purchase.test.ts
// No real StoreKit transaction can be made without an iPhone: a chain shaped like
// Apple's (root P-384, intermediate with Apple's OID, P-256 leaf with Apple's OID) is
// made here, and the verifier is given its root's fingerprint instead of Apple's.
import * as x509 from "npm:@peculiar/x509@1.14.3";

import { PACKS, verifyTransaction } from "./purchase.ts";

x509.cryptoProvider.set(crypto);

const P384 = { name: "ECDSA", namedCurve: "P-384", hash: "SHA-384" } as const;
const P256 = { name: "ECDSA", namedCurve: "P-256" } as const;
const BUNDLE = "com.guigousse.TierCraft";
const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const text64 = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
const der64 = (c: x509.X509Certificate) => btoa(String.fromCharCode(...new Uint8Array(c.rawData)));
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

const notBefore = new Date("2026-01-01T00:00:00Z"), notAfter = new Date("2030-01-01T00:00:00Z");
const at = new Date("2026-10-15T12:00:00Z");

async function chain(opts: { leafOid?: boolean } = {}) {
  const rootKeys = await crypto.subtle.generateKey(P384, true, ["sign", "verify"]);
  const caKeys = await crypto.subtle.generateKey(P384, true, ["sign", "verify"]);
  const leafKeys = await crypto.subtle.generateKey(P256, true, ["sign", "verify"]);
  const root = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: "01", name: "CN=Test Root", notBefore, notAfter, keys: rootKeys, signingAlgorithm: P384,
    extensions: [new x509.BasicConstraintsExtension(true, undefined, true)],
  });
  const ca = await x509.X509CertificateGenerator.create({
    serialNumber: "02", subject: "CN=Test WWDR", issuer: root.subject, notBefore, notAfter,
    publicKey: caKeys.publicKey, signingKey: rootKeys.privateKey, signingAlgorithm: P384,
    extensions: [new x509.BasicConstraintsExtension(true, 0, true), new x509.Extension("1.2.840.113635.100.6.2.1", false, new Uint8Array([5, 0]))],
  });
  const leaf = await x509.X509CertificateGenerator.create({
    serialNumber: "03", subject: "CN=Test StoreKit", issuer: ca.subject, notBefore, notAfter,
    publicKey: leafKeys.publicKey, signingKey: caKeys.privateKey, signingAlgorithm: P384,
    extensions: opts.leafOid === false ? [] : [new x509.Extension("1.2.840.113635.100.6.11.1", false, new Uint8Array([5, 0]))],
  });
  const rootFingerprint = hex(await crypto.subtle.digest("SHA-256", root.rawData));
  return { root, ca, leaf, leafKey: leafKeys.privateKey, rootFingerprint };
}

async function signed(c: Awaited<ReturnType<typeof chain>>, payload: Record<string, unknown>, x5c = [c.leaf, c.ca, c.root]) {
  const input = `${text64({ alg: "ES256", x5c: x5c.map(der64) })}.${text64(payload)}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, c.leafKey, new TextEncoder().encode(input)));
  return `${input}.${b64url(sig)}`;
}

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
