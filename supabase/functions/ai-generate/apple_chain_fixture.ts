// A certificate chain shaped like Apple's (root P-384, intermediate with Apple's WWDR
// OID, P-256 leaf with StoreKit's OID) and JWS signed by it: no real App Store signature
// can be made without an iPhone. The verifiers are given this root's fingerprint.
import * as x509 from "npm:@peculiar/x509@1.14.3";

x509.cryptoProvider.set(crypto);

const P384 = { name: "ECDSA", namedCurve: "P-384", hash: "SHA-384" } as const;
const P256 = { name: "ECDSA", namedCurve: "P-256" } as const;
const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const text64 = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
const der64 = (c: x509.X509Certificate) => btoa(String.fromCharCode(...new Uint8Array(c.rawData)));
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

const notBefore = new Date("2026-01-01T00:00:00Z"), notAfter = new Date("2030-01-01T00:00:00Z");
export const at = new Date("2026-10-15T12:00:00Z");

export type Chain = Awaited<ReturnType<typeof chain>>;

export async function chain(opts: { leafOid?: boolean } = {}) {
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

export { text64 };

export async function signed(c: Chain, payload: Record<string, unknown>, x5c = [c.leaf, c.ca, c.root]) {
  const input = `${text64({ alg: "ES256", x5c: x5c.map(der64) })}.${text64(payload)}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, c.leafKey, new TextEncoder().encode(input)));
  return `${input}.${b64url(sig)}`;
}
