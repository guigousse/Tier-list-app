// deno test --allow-read supabase/functions/ai-generate/appAttest.test.ts
// Real attestations from node-app-attest (MIT, github.com/uebelack/node-app-attest),
// made by its example app: they let the whole check run without an iPhone.
import { verifyAttestation } from "./appAttest.ts";

// Their certificates were valid in March 2024 (made early February), not today.
const APP = { teamId: "V8H6LQ9448", bundleId: "io.uebelacker.AppAttestExample", at: new Date("2024-03-01T12:00:00Z") };
const load = async (name: string) => JSON.parse(await Deno.readTextFile(new URL(`./fixtures/attestation-${name}.json`, import.meta.url)));
// The fixtures' challenges are sent base64-encoded; the iPhone hashes the text it was given.
const challengeOf = (f: { challenge: string }) => atob(f.challenge);

async function refused(promise: Promise<unknown>, reason: string) {
  try {
    await promise;
  } catch (e) {
    if (!(e instanceof Error) || !e.message.includes(reason)) throw new Error(`attendu « ${reason} », obtenu ${e}`);
    return;
  }
  throw new Error(`accepté alors qu'il fallait refuser (${reason})`);
}

Deno.test("une vraie attestation de production est acceptée", async () => {
  const f = await load("production");
  const r = await verifyAttestation({ attestation: f.attestation, challenge: challengeOf(f), keyId: f.keyId, ...APP });
  if (r.environment !== "production" || r.keyId !== f.keyId) throw new Error(JSON.stringify(r));
});

Deno.test("une attestation de développement n'est acceptée que si on l'autorise", async () => {
  const f = await load("development");
  await refused(verifyAttestation({ attestation: f.attestation, challenge: challengeOf(f), keyId: f.keyId, ...APP }), "development");
  const r = await verifyAttestation({ attestation: f.attestation, challenge: challengeOf(f), keyId: f.keyId, ...APP, allowDevelopment: true });
  if (r.environment !== "development") throw new Error(JSON.stringify(r));
});

Deno.test("rejouée avec un autre défi, l'attestation est refusée", async () => {
  const f = await load("production");
  await refused(verifyAttestation({ attestation: f.attestation, challenge: "autre-defi", keyId: f.keyId, ...APP }), "nonce");
});

Deno.test("une attestation d'une autre app est refusée", async () => {
  const f = await load("production");
  await refused(verifyAttestation({ attestation: f.attestation, challenge: challengeOf(f), keyId: f.keyId, teamId: "AAAAAAAAAA", bundleId: "com.guigousse.TierCraft", at: APP.at }), "app");
});

Deno.test("une clé qui n'est pas celle du certificat est refusée", async () => {
  const f = await load("production");
  await refused(verifyAttestation({ attestation: f.attestation, challenge: challengeOf(f), keyId: btoa("x".repeat(32)), ...APP }), "keyId");
});

Deno.test("une attestation altérée est refusée", async () => {
  const f = await load("production");
  const bytes = Uint8Array.from(atob(f.attestation), (c) => c.charCodeAt(0));
  bytes[bytes.length - 40] ^= 0xff; // in authData's credential id
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  await refused(verifyAttestation({ attestation: btoa(s), challenge: challengeOf(f), keyId: f.keyId, ...APP }), "");
});

Deno.test("des certificats expirés sont refusés", async () => {
  const f = await load("production");
  await refused(verifyAttestation({ attestation: f.attestation, challenge: challengeOf(f), keyId: f.keyId, ...APP, at: new Date("2026-10-15") }), "certificate chain");
});
