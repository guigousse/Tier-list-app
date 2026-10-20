// deno test supabase/functions/referral-claim/
import { appleHost, bitsFromResponse, deviceCheckJwt, importP8, queryBit0, setBit0 } from "./deviceCheck.ts";
import { decideClaim, type Deps } from "./claim.ts";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

const b64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** A test key pair, the private half written like Apple's .p8 file. */
async function testKey() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const der = b64(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const pem = `-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----`;
  return { pem, publicKey: pair.publicKey };
}

Deno.test("the JWT is ES256, signed by the .p8 key, with the team and key ids", async () => {
  const { pem, publicKey } = await testKey();
  const jwt = await deviceCheckJwt(await importP8(pem), "KEY123", "9D78779LKL", 1_700_000_000_000);
  const [h, p, s] = jwt.split(".");
  same(JSON.parse(new TextDecoder().decode(fromB64url(h))), { alg: "ES256", kid: "KEY123" });
  same(JSON.parse(new TextDecoder().decode(fromB64url(p))), { iss: "9D78779LKL", iat: 1_700_000_000 });
  // JWS wants the raw r||s signature (64 bytes), which is what WebCrypto gives and checks.
  same(fromB64url(s).length, 64);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, fromB64url(s), new TextEncoder().encode(`${h}.${p}`));
  same(ok, true);
});

Deno.test("the .p8 is read even pasted on one line or with escaped line breaks", async () => {
  const { pem } = await testKey();
  await importP8(pem.replace(/\n/g, "\\n"));
  await importP8(pem.replace(/\n/g, " "));
});

Deno.test("Apple's answers to query_two_bits", () => {
  same(bitsFromResponse(200, '{"bit0":true,"bit1":false,"last_update_time":"2026-10"}'), { bit0: true, bit1: false });
  same(bitsFromResponse(200, '{"bit0":false,"bit1":true,"last_update_time":"2026-10"}'), { bit0: false, bit1: true });
  // Never set for this device: Apple says so in plain text, still a 200.
  same(bitsFromResponse(200, "Failed to find bit state"), { bit0: false, bit1: false });
  // A bad token, a bad JWT, Apple down, rate-limited: no answer, not "unused".
  same(bitsFromResponse(400, "Missing or incorrectly formatted device token payload"), null);
  same(bitsFromResponse(401, "Unable to verify authorization token"), null);
  same(bitsFromResponse(500, ""), null);
  same(bitsFromResponse(429, ""), null);
  same(bitsFromResponse(200, "something else"), null);
});

Deno.test("production by default, development only when asked", () => {
  same(appleHost(false), "https://api.devicecheck.apple.com");
  same(appleHost(true), "https://api.development.devicecheck.apple.com");
});

Deno.test("query and update send the token, a transaction id and a timestamp in ms", async () => {
  const sent: { url: string; init: RequestInit }[] = [];
  const fake = (status: number, text: string) => (async (url: string, init: RequestInit) => {
    sent.push({ url, init });
    return new Response(text, { status });
  }) as typeof fetch;
  const opts = { jwt: "J", development: false, now: 1234 };
  same(await queryBit0("TOKEN", { ...opts, fetch: fake(200, "Failed to find bit state") }), { bit0: false, bit1: false });
  same(sent[0].url, "https://api.devicecheck.apple.com/v1/query_two_bits");
  same((sent[0].init.headers as Record<string, string>).Authorization, "Bearer J");
  const body = JSON.parse(String(sent[0].init.body));
  same([body.device_token, body.timestamp, typeof body.transaction_id], ["TOKEN", 1234, "string"]);

  same(await setBit0("TOKEN", false, { ...opts, fetch: fake(200, "") }), true);
  same(sent[1].url, "https://api.devicecheck.apple.com/v1/update_two_bits");
  const update = JSON.parse(String(sent[1].init.body));
  same([update.device_token, update.bit0, update.bit1, update.timestamp], ["TOKEN", true, false, 1234]);
  same(await setBit0("TOKEN", false, { ...opts, fetch: fake(500, "") }), false);

  // Apple out of reach: no answer, never an exception.
  const offline = (async () => {
    throw new TypeError("network");
  }) as typeof fetch;
  same(await queryBit0("TOKEN", { ...opts, fetch: offline }), null);
  same(await setBit0("TOKEN", false, { ...opts, fetch: offline }), false);
});

/** The decision's outside world, logging every call. */
function world(bits: { bit0: boolean; bit1: boolean } | null, status = "credited", setOk = true) {
  const calls: string[] = [];
  const deps: Deps = {
    queryBits: async (token) => {
      calls.push(`query(${token})`);
      return bits;
    },
    claim: async () => {
      calls.push("claim");
      return status;
    },
    setBit0: async (token, bit1) => {
      calls.push(`set(${token},${bit1})`);
      return setOk;
    },
  };
  return { deps, calls };
}

Deno.test("a device already sponsored: nothing claimed", async () => {
  const w = world({ bit0: true, bit1: false });
  same(await decideClaim("T", w.deps), "device_used");
  same(w.calls, ["query(T)"]);
});

Deno.test("a fresh device: claimed, then marked once credited", async () => {
  const w = world({ bit0: false, bit1: true });
  same(await decideClaim("T", w.deps), "credited");
  same(w.calls, ["query(T)", "claim", "set(T,true)"]);
});

Deno.test("not credited (already, own, cap…): the device stays unmarked", async () => {
  for (const status of ["already", "own", "not_new", "cap", "unknown"]) {
    const w = world({ bit0: false, bit1: false }, status);
    same(await decideClaim("T", w.deps), status);
    same(w.calls, ["query(T)", "claim"]);
  }
});

Deno.test("Apple out of reach: no claim without the check, the app tries again", async () => {
  const w = world(null);
  same(await decideClaim("T", w.deps), "retry");
  same(w.calls, ["query(T)"]);
});

Deno.test("marking fails once: tried again, the credit stands", async () => {
  const w = world({ bit0: false, bit1: false }, "credited", false);
  same(await decideClaim("T", w.deps), "credited");
  same(w.calls, ["query(T)", "claim", "set(T,false)", "set(T,false)"]);
});

Deno.test("no token (Android, web, an older app): no referral", async () => {
  const w = world({ bit0: false, bit1: false });
  same(await decideClaim("", w.deps), "not_new");
  same(w.calls, []);
});
