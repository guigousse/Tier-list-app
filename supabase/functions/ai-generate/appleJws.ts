// Anything the App Store signs (StoreKit 2 transactions, server notifications) is a JWS
// whose x5c chain leads to Apple Root CA G3: checked here link by link before a single
// field of it is believed.
import { p256 } from "npm:@noble/curves@1.9.7/p256";
import * as x509 from "npm:@peculiar/x509@1.14.3";

import { ecKey, signedBy } from "./certs.ts";

/** SHA-256 of Apple Root CA - G3, which every App Store signature leads to. */
export const APPLE_ROOT_G3 = "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";
/** Marks Apple puts on the certificates of its WWDR intermediate and of StoreKit's signer. */
const WWDR_OID = "1.2.840.113635.100.6.2.1";
const STOREKIT_OID = "1.2.840.113635.100.6.11.1";

const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export type AppleJwsOptions = { rootFingerprint?: string; at?: Date };

/** The payload of a JWS signed by the App Store; throws with the reason when anything doesn't hold. */
export async function verifyAppleJws(jws: string, opts: AppleJwsOptions = {}): Promise<Record<string, unknown>> {
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

  // 2. The content itself, signed by the leaf's P-256 key (r ‖ s, 64 bytes).
  const key = ecKey(leaf);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${parts[0]}.${parts[1]}`)));
  let valid = false;
  try {
    valid = key?.curve === p256 && p256.verify(fromB64url(parts[2]), digest, key.point, { prehash: false, lowS: false, format: "compact" });
  } catch {
    valid = false;
  }
  if (!valid) throw new Error("signature does not match");
  return payload;
}
