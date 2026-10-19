// Certificate checks shared by App Attest and the App Store purchases. Deno has neither
// node:crypto's X509Certificate.verify nor WebCrypto's ECDSA when the hash doesn't match
// the curve (Apple's CAs sign with P-384 and SHA-256 as well as SHA-384): the
// signatures are checked with noble.
import { p256 } from "npm:@noble/curves@1.9.7/p256";
import { p384 } from "npm:@noble/curves@1.9.7/p384";
import * as x509 from "npm:@peculiar/x509@1.14.3";

/** One DER element at `at`: where its value starts and where the element ends. */
function element(der: Uint8Array, at: number) {
  let len = der[at + 1];
  let head = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + der[at + 2 + i];
    head += n;
  }
  return { start: at + head, end: at + head + len };
}

/**
 * Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature BIT STRING }:
 * the signed bytes and the signature, read from the DER (the library keeps them private).
 */
function signedParts(raw: Uint8Array) {
  const outer = element(raw, 0);
  const tbs = element(raw, outer.start);
  const alg = element(raw, tbs.end);
  const sig = element(raw, alg.end);
  // A BIT STRING's first byte counts unused bits (0 here): the DER signature follows.
  return { tbs: raw.subarray(outer.start, tbs.end), signature: raw.subarray(sig.start + 1, sig.end) };
}

/** An EC public key: its curve, told by the length of the uncompressed point ending the SPKI. */
export function ecKey(cert: x509.X509Certificate) {
  const spki = new Uint8Array(cert.publicKey.rawData);
  // P-256: 91-byte SPKI, 65-byte point; P-384: 120 and 97.
  if (spki.length === 91) return { curve: p256, point: spki.subarray(spki.length - 65) };
  if (spki.length === 120) return { curve: p384, point: spki.subarray(spki.length - 97) };
  return null;
}

/** `cert` signed by `issuer`'s EC key, and valid at `date`. */
export async function signedBy(cert: x509.X509Certificate, issuer: x509.X509Certificate, date: Date) {
  if (date < cert.notBefore || date > cert.notAfter) return false;
  const hash = (cert.signatureAlgorithm as { hash?: { name?: string } }).hash?.name;
  if (hash !== "SHA-256" && hash !== "SHA-384") return false;
  const key = ecKey(issuer);
  if (!key) return false;
  const { tbs, signature } = signedParts(new Uint8Array(cert.rawData));
  const digest = new Uint8Array(await crypto.subtle.digest(hash, tbs));
  try {
    return key.curve.verify(signature, digest, key.point, { prehash: false, lowS: false });
  } catch {
    return false;
  }
}
