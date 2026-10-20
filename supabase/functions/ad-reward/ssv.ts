// AdMob's server-side verification (SSV) of a rewarded ad, as Google documents it:
// https://developers.google.com/admob/android/ssv#manual_verification
// The callback is a GET whose query string ends with "&signature=…&key_id=…". The signed
// message is the query string as received, up to (not including) "&signature=": the
// parameters stay URL-encoded and in Google's order, so nothing is rebuilt from parsed
// values. The signature is ECDSA P-256 / SHA-256, DER-encoded, in URL-safe base64.

export const VERIFIER_KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";

export type Callback = {
  /** The signed bytes: the raw query string before "&signature=". */
  message: string;
  signature: string;
  keyId: string;
  adUnit: string;
  customData: string;
  transactionId: string;
};

/** Reads a callback URL; null when it can't be a signed AdMob callback. */
export function parseCallback(url: string): Callback | null {
  const q = url.indexOf("?");
  if (q < 0) return null;
  const query = url.slice(q + 1);
  const cut = query.indexOf("&signature=");
  if (cut <= 0) return null;
  const params = new URLSearchParams(query);
  const signature = params.get("signature") ?? "";
  const keyId = params.get("key_id") ?? "";
  if (!signature || !/^\d+$/.test(keyId)) return null;
  return {
    message: query.slice(0, cut),
    signature,
    keyId,
    adUnit: params.get("ad_unit") ?? "",
    customData: params.get("custom_data") ?? "",
    transactionId: params.get("transaction_id") ?? "",
  };
}

/** Whether the callback is for our rewarded unit (Google sends its number, with or without the publisher part). */
export function isOurAdUnit(adUnit: string, unit: string): boolean {
  return adUnit === unit || adUnit.endsWith(`/${unit}`);
}

export function base64UrlDecode(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * DER (SEQUENCE { INTEGER r, INTEGER s }) to the fixed-size r‖s WebCrypto verifies.
 * Null for anything that isn't a well-formed P-256 signature.
 */
export function derToRaw(der: Uint8Array, size = 32): Uint8Array<ArrayBuffer> | null {
  let i = 0;
  if (der[i++] !== 0x30) return null;
  let len = der[i++];
  if (len & 0x80) {
    // Long form: a P-256 signature never needs more than one length byte.
    if ((len & 0x7f) !== 1) return null;
    len = der[i++];
  }
  if (len !== der.length - i) return null;
  const out = new Uint8Array(size * 2);
  for (let part = 0; part < 2; part++) {
    if (der[i++] !== 0x02) return null;
    let n = der[i++];
    if (n === undefined || n < 1 || i + n > der.length) return null;
    let int = der.subarray(i, i + n);
    i += n;
    // The sign byte DER adds before a high first byte.
    while (int.length > size && int[0] === 0) int = int.subarray(1);
    if (int.length > size) return null;
    n = int.length;
    out.set(int, part * size + (size - n));
  }
  return i === der.length ? out : null;
}

/** Verifies `signature` (DER, URL-safe base64) of `message` with a SPKI public key (base64). */
export async function verifySignature(message: string, signature: string, spkiBase64: string): Promise<boolean> {
  try {
    const raw = derToRaw(base64UrlDecode(signature));
    if (!raw) return false;
    const key = await crypto.subtle.importKey(
      "spki",
      base64UrlDecode(spkiBase64),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, raw, new TextEncoder().encode(message));
  } catch {
    return false;
  }
}

/** Google's verifier keys by id, from {"keys":[{"keyId":…,"base64":"…"}]}. */
export function parseKeys(raw: unknown): Map<string, string> {
  const keys = new Map<string, string>();
  const list = (raw as { keys?: unknown })?.keys;
  if (!Array.isArray(list)) return keys;
  for (const k of list) {
    if (k && (typeof k.keyId === "number" || typeof k.keyId === "string") && typeof k.base64 === "string") {
      keys.set(String(k.keyId), k.base64);
    }
  }
  return keys;
}

type Fetch = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/**
 * The keys, cached for a day. Google rotates them: an id not in the cache fetches them
 * again, at most once a minute so a forged key_id can't make us hammer gstatic.
 */
export function keyStore(fetcher: Fetch = fetch, now: () => number = Date.now) {
  let keys = new Map<string, string>();
  let fetchedAt = -Infinity;
  return async (keyId: string): Promise<string | null> => {
    const age = now() - fetchedAt;
    if (age > 24 * 3600_000 || (!keys.has(keyId) && age > 60_000)) {
      try {
        const res = await fetcher(VERIFIER_KEYS_URL);
        if (res.ok) {
          const fresh = parseKeys(await res.json());
          if (fresh.size > 0) keys = fresh;
        }
      } catch {
        // gstatic out of reach: the keys known stay in use.
      }
      fetchedAt = now();
    }
    return keys.get(keyId) ?? null;
  };
}
