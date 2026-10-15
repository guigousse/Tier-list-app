// Apple App Attest: proof that a request comes from a genuine copy of the app on a real
// Apple device. It guards the welcome credits: without it, a script could open wallets
// by the thousand and drain the bonus. The steps follow Apple's "Validating apps that
// connect to your server"; node-app-attest (MIT) served as a reference, but its
// node:crypto certificate check isn't implemented in Deno (certs.ts).
import { decode } from "npm:cbor-x@1.6.6";
import * as x509 from "npm:@peculiar/x509@1.14.3";

import { signedBy } from "./certs.ts";

// Apple App Attestation Root CA (valid until 2045), from Apple's Private PKI page.
const ROOT = new x509.X509Certificate(
  "MIICITCCAaegAwIBAgIQC/O+DvHN0uD7jG5yH2IXmDAKBggqhkjOPQQDAzBSMSYwJAYDVQQDDB1BcHBsZSBBcHAgQXR0ZXN0YXRpb24gUm9vdCBDQTETMBEGA1UECgwKQXBwbGUgSW5jLjETMBEGA1UECAwKQ2FsaWZvcm5pYTAeFw0yMDAzMTgxODMyNTNaFw00NTAzMTUwMDAwMDBaMFIxJjAkBgNVBAMMHUFwcGxlIEFwcCBBdHRlc3RhdGlvbiBSb290IENBMRMwEQYDVQQKDApBcHBsZSBJbmMuMRMwEQYDVQQIDApDYWxpZm9ybmlhMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAERTHhmLW07ATaFQIEVwTtT4dyctdhNbJhFs/Ii2FdCgAHGbpphY3+d8qjuDngIN3WVhQUBHAoMeQ/cLiP1sOUtgjqK9auYen1mMEvRq9Sk3Jm5X8U62H+xTD3FE9TgS41o0IwQDAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBSskRBTM72+aEH/pwyp5frq5eWKoTAOBgNVHQ8BAf8EBAMCAQYwCgYIKoZIzj0EAwMDaAAwZQIwQgFGnByvsiVbpTKwSga0kP0e8EeDS4+sQmTvb7vn53O5+FRXgeLhpJ06ysC5PrOyAjEAp5U4xDgEgllF7En3VcE3iexZZtKeYnpqtijVoyFraWVIyd/dganmrduC1bmTBGwD",
);
const NONCE_OID = "1.2.840.113635.100.8.2";
const PRODUCTION = "appattest\0\0\0\0\0\0\0";
const DEVELOPMENT = "appattestdevelop";

const text = (b: Uint8Array) => new TextDecoder().decode(b);
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const sha256 = async (b: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", b));
const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

/** The value of the innermost DER element: the nonce sits in SEQUENCE { [1] { OCTET STRING } }. */
function innermost(der: Uint8Array): Uint8Array {
  let at = 0;
  let value = der;
  while (at < der.length) {
    const tag = der[at];
    let len = der[at + 1];
    let head = 2;
    if (len & 0x80) {
      const n = len & 0x7f;
      len = 0;
      for (let i = 0; i < n; i++) len = (len << 8) | der[at + 2 + i];
      head += n;
    }
    value = der.subarray(at + head, at + head + len);
    // Constructed (SEQUENCE, [1]): go inside; primitive (OCTET STRING): that's it.
    if (tag & 0x20) at += head;
    else return value;
  }
  return value;
}

export type Attested = { keyId: string; environment: "production" | "development" };

/**
 * Checks an attestation made by `attestKeyAsync(keyId, challenge)` on the iPhone, for the
 * app `teamId.bundleId`. Throws with the reason when anything doesn't hold.
 */
export async function verifyAttestation(p: {
  attestation: string;
  challenge: string;
  keyId: string;
  teamId: string;
  bundleId: string;
  allowDevelopment?: boolean;
  /** When the certificates must be valid: now, except in tests on old real attestations. */
  at?: Date;
}): Promise<Attested> {
  let obj: { fmt?: string; attStmt?: { x5c?: Uint8Array[]; receipt?: Uint8Array }; authData?: Uint8Array };
  try {
    obj = decode(fromB64(p.attestation));
  } catch {
    throw new Error("invalid attestation");
  }
  const x5c = obj?.attStmt?.x5c;
  const authData = obj?.authData;
  if (obj?.fmt !== "apple-appattest" || !Array.isArray(x5c) || x5c.length !== 2 || !(authData instanceof Uint8Array)) {
    throw new Error("invalid attestation");
  }

  // 1. The credential certificate, signed by Apple's App Attestation CA, itself signed by the root.
  let cred: x509.X509Certificate, ca: x509.X509Certificate;
  try {
    [cred, ca] = x5c.map((der) => new x509.X509Certificate(der));
  } catch {
    throw new Error("invalid certificate");
  }
  const date = p.at ?? new Date();
  if (!(await signedBy(ca, ROOT, date))) throw new Error("certificate chain: CA");
  if (!(await signedBy(cred, ca, date))) throw new Error("certificate chain: credential");

  // 2–4. The nonce in the certificate binds it to this authData and this challenge.
  const clientDataHash = await sha256(new TextEncoder().encode(p.challenge));
  const expected = await sha256(new Uint8Array([...authData, ...clientDataHash]));
  const ext = cred.getExtension(NONCE_OID);
  if (!ext || !equal(innermost(new Uint8Array(ext.value)), expected)) throw new Error("nonce does not match");

  // 5. The key id is the hash of the credential's public key (uncompressed EC point).
  const spki = new Uint8Array(cred.publicKey.rawData);
  const point = spki.subarray(spki.length - 65);
  if (b64(await sha256(point)) !== p.keyId) throw new Error("keyId does not match");

  // 6. The attestation was made for this app.
  const appIdHash = await sha256(new TextEncoder().encode(`${p.teamId}.${p.bundleId}`));
  if (!equal(authData.subarray(0, 32), appIdHash)) throw new Error("app does not match");

  // 7. A fresh key: counter 0.
  const counter = new DataView(authData.buffer, authData.byteOffset + 33, 4).getUint32(0);
  if (counter !== 0) throw new Error("counter is not 0");

  // 8. Production, or development when allowed (builds run from Xcode).
  const aaguid = text(authData.subarray(37, 53));
  if (aaguid !== PRODUCTION && aaguid !== DEVELOPMENT) throw new Error("aaguid is not valid");
  if (aaguid === DEVELOPMENT && !p.allowDevelopment) throw new Error("development environment is not allowed");

  // 9. The credential id is the key id.
  const idLength = new DataView(authData.buffer, authData.byteOffset + 53, 2).getUint16(0);
  if (b64(authData.subarray(55, 55 + idLength)) !== p.keyId) throw new Error("credentialId does not match");

  return { keyId: p.keyId, environment: aaguid === PRODUCTION ? "production" : "development" };
}
