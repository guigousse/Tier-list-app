// Apple's DeviceCheck: 2 bits per device and per developer team, kept by Apple across
// reinstalls. bit0 = "this iPhone has already been sponsored once".
// https://developer.apple.com/documentation/devicecheck/accessing-and-modifying-per-device-data

export type Bits = { bit0: boolean; bit1: boolean };

export type AppleCall = { jwt: string; development: boolean; now?: number; fetch?: typeof fetch };

/** TestFlight and App Store builds talk to production; only builds run from Xcode to development. */
export const appleHost = (development: boolean) =>
  development ? "https://api.development.devicecheck.apple.com" : "https://api.devicecheck.apple.com";

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const utf8 = (s: string) => new TextEncoder().encode(s);

/** The .p8 key from App Store Connect, however it was pasted into the secret. */
export function importP8(pem: string): Promise<CryptoKey> {
  const base64 = pem
    .replace(/\\n/g, "\n")
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

/** The bearer token Apple expects: ES256, kid = the key's id, iss = the team, iat in seconds. */
export async function deviceCheckJwt(key: CryptoKey, keyId: string, teamId: string, now = Date.now()): Promise<string> {
  const head = b64url(utf8(JSON.stringify({ alg: "ES256", kid: keyId })));
  const claims = b64url(utf8(JSON.stringify({ iss: teamId, iat: Math.floor(now / 1000) })));
  // WebCrypto signs ECDSA in IEEE P1363 (r||s), the very format JWS wants: no DER to unwrap.
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, utf8(`${head}.${claims}`));
  return `${head}.${claims}.${b64url(new Uint8Array(signature))}`;
}

/**
 * query_two_bits' answer, or null when there is none to trust. A device whose bits were never
 * set gets a 200 with the text "Failed to find bit state" rather than JSON.
 */
export function bitsFromResponse(status: number, text: string): Bits | null {
  if (status !== 200) return null;
  if (text.includes("Failed to find bit state")) return { bit0: false, bit1: false };
  try {
    const body = JSON.parse(text);
    if (typeof body?.bit0 !== "boolean" && typeof body?.bit1 !== "boolean") return null;
    return { bit0: body.bit0 === true, bit1: body.bit1 === true };
  } catch {
    return null;
  }
}

async function post(path: string, body: object, call: AppleCall): Promise<{ status: number; text: string } | null> {
  try {
    const res = await (call.fetch ?? fetch)(`${appleHost(call.development)}/v1/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${call.jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, transaction_id: crypto.randomUUID(), timestamp: call.now ?? Date.now() }),
      signal: AbortSignal.timeout(8000),
    });
    return { status: res.status, text: await res.text() };
  } catch (e) {
    console.error("devicecheck", path, e instanceof Error ? e.message : e);
    return null;
  }
}

/** This device's bits, or null if Apple couldn't tell (out of reach, token refused…). */
export async function queryBit0(token: string, call: AppleCall): Promise<Bits | null> {
  const res = await post("query_two_bits", { device_token: token }, call);
  if (!res) return null;
  const bits = bitsFromResponse(res.status, res.text);
  if (!bits) console.error("devicecheck query", res.status, res.text.slice(0, 200));
  return bits;
}

/** Sets bit0, keeping bit1 as it was read. True once Apple accepted it. */
export async function setBit0(token: string, bit1: boolean, call: AppleCall): Promise<boolean> {
  const res = await post("update_two_bits", { device_token: token, bit0: true, bit1 }, call);
  if (res && res.status !== 200) console.error("devicecheck update", res.status, res.text.slice(0, 200));
  return res?.status === 200;
}
