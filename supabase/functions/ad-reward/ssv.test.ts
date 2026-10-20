// deno test supabase/functions/ad-reward/ssv.test.ts
import { handle } from "./handler.ts";
import { base64UrlDecode, derToRaw, isOurAdUnit, keyStore, parseCallback, parseKeys, verifySignature } from "./ssv.ts";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

/** r‖s to DER, as Google sends it: each integer minimal, with a 0 byte before a high bit. */
function rawToDer(raw: Uint8Array): Uint8Array {
  const int = (b: Uint8Array) => {
    let i = 0;
    while (i < b.length - 1 && b[i] === 0) i++;
    const v = b.subarray(i);
    const body = v[0] & 0x80 ? [0, ...v] : [...v];
    return [0x02, body.length, ...body];
  };
  const seq = [...int(raw.subarray(0, 32)), ...int(raw.subarray(32))];
  return new Uint8Array([0x30, seq.length, ...seq]);
}

/** A test key pair standing in for Google's, and a callback URL signed with it. */
async function signer() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const spki = b64(await crypto.subtle.exportKey("spki", pair.publicKey));
  const sign = async (message: string) =>
    b64url(rawToDer(new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, new TextEncoder().encode(message)))));
  const url = async (params: Record<string, string>, keyId = "1234") => {
    const message = new URLSearchParams(params).toString();
    return `https://x.supabase.co/functions/v1/ad-reward?${message}&signature=${await sign(message)}&key_id=${keyId}`;
  };
  return { spki, sign, url };
}

const PARAMS = {
  ad_network: "5450213213286189855",
  ad_unit: "7429871139",
  custom_data: "a".repeat(64),
  reward_amount: "5",
  reward_item: "energie",
  timestamp: "1760000000000",
  transaction_id: "123456789",
  user_id: "",
};

Deno.test("le message signé est la requête telle que reçue, jusqu'avant &signature", () => {
  const cb = parseCallback("https://h/f?ad_network=1&ad_unit=7429871139&custom_data=t%2Bx&transaction_id=9&signature=abc-_&key_id=42");
  same(cb, {
    message: "ad_network=1&ad_unit=7429871139&custom_data=t%2Bx&transaction_id=9",
    signature: "abc-_",
    keyId: "42",
    adUnit: "7429871139",
    customData: "t+x",
    transactionId: "9",
  });
});

Deno.test("sans signature ni key_id numérique, ce n'est pas un rappel d'AdMob", () => {
  same(parseCallback("https://h/f"), null);
  same(parseCallback("https://h/f?ad_unit=1&transaction_id=9"), null);
  same(parseCallback("https://h/f?ad_unit=1&signature=abc&key_id=x"), null);
  same(parseCallback("https://h/f?signature=abc&key_id=1"), null);
});

Deno.test("le bloc récompensé, avec ou sans la partie éditeur", () => {
  same(isOurAdUnit("7429871139", "7429871139"), true);
  same(isOurAdUnit("ca-app-pub-6928338731034491/7429871139", "7429871139"), true);
  same(isOurAdUnit("1712485313", "7429871139"), false);
  same(isOurAdUnit("", "7429871139"), false);
});

Deno.test("une signature DER redevient r‖s, octets de signe ôtés et entiers courts complétés", () => {
  const raw = new Uint8Array(64);
  raw[0] = 0x80; // r with its high bit: DER adds a 0 byte
  raw[33] = 0x01; // s starting with a 0 byte: DER drops it
  raw[63] = 0x07;
  same([...derToRaw(rawToDer(raw))!], [...raw]);
  same(derToRaw(new Uint8Array([0x31, 0])), null);
  same(derToRaw(new Uint8Array([0x30, 5, 2, 1, 1])), null);
});

Deno.test("une vraie signature passe ; un paramètre changé, une autre clé ou du bruit échouent", async () => {
  const google = await signer();
  const other = await signer();
  const cb = parseCallback(await google.url(PARAMS))!;
  same(await verifySignature(cb.message, cb.signature, google.spki), true);
  same(await verifySignature(cb.message.replace("reward_amount=5", "reward_amount=500"), cb.signature, google.spki), false);
  same(await verifySignature(cb.message, cb.signature, other.spki), false);
  same(await verifySignature(cb.message, "pas-une-signature", google.spki), false);
  same(await verifySignature(cb.message, cb.signature, "pas-une-clé"), false);
});

Deno.test("les clés de Google, lues par identifiant", () => {
  const keys = parseKeys({ keys: [{ keyId: 3335741209, pem: "-----BEGIN…", base64: "MFk" }, { keyId: "x" }, null] });
  same([...keys], [["3335741209", "MFk"]]);
  same(parseKeys(null).size, 0);
});

Deno.test("les clés restent en cache ; un identifiant inconnu les recharge, au plus une fois par minute", async () => {
  let now = 0;
  let calls = 0;
  const served = [{ keys: [{ keyId: 1, base64: "A" }] }, { keys: [{ keyId: 1, base64: "A" }, { keyId: 2, base64: "B" }] }];
  const key = keyStore(async () => ({ ok: true, json: async () => served[Math.min(calls++, 1)] }), () => now);
  same(await key("1"), "A");
  same(await key("1"), "A");
  same(calls, 1);
  same(await key("2"), null); // too soon after the last fetch
  same(calls, 1);
  now += 61_000;
  same(await key("2"), "B");
  same(calls, 2);
  now += 25 * 3600_000;
  await key("1");
  same(calls, 3);
});

function fakeDeps(spki: string, answer = "credited") {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      key: async (id: string) => (id === "1234" ? spki : null),
      reward: async (ticket: string, tx: string) => {
        calls.push(`${ticket}:${tx}`);
        return { data: answer, error: null };
      },
    },
  };
}

Deno.test("un rappel signé par Google crédite le ticket de la pub", async () => {
  const google = await signer();
  const { calls, deps } = fakeDeps(google.spki);
  const res = await handle(new Request(await google.url(PARAMS)), deps);
  same([res.status, await res.text()], [200, "credited"]);
  same(calls, [`${PARAMS.custom_data}:123456789`]);
});

Deno.test("sans signature valide : refusé (403, pas 500), rien crédité", async () => {
  const google = await signer();
  const forger = await signer();
  const { calls, deps } = fakeDeps(google.spki);
  for (const url of [
    "https://x/ad-reward",
    "https://x/ad-reward?ad_unit=7429871139&custom_data=t&transaction_id=1",
    await forger.url(PARAMS),
    await google.url(PARAMS, "999"),
    (await google.url(PARAMS)).replace("reward_amount=5", "reward_amount=50"),
  ]) {
    const res = await handle(new Request(url), deps);
    same(res.status, 403);
    await res.body?.cancel();
  }
  same(calls, []);
});

Deno.test("signé mais pour un autre bloc, ou sans ticket : 200 sans rien créditer", async () => {
  const google = await signer();
  const { calls, deps } = fakeDeps(google.spki);
  for (const params of [{ ...PARAMS, ad_unit: "1712485313" }, { ...PARAMS, custom_data: "" }]) {
    const res = await handle(new Request(await google.url(params)), deps);
    same([res.status, await res.text()], [200, "ignored"]);
  }
  same(calls, []);
});

Deno.test("une panne de la base répond 500, pour qu'AdMob réessaie", async () => {
  const google = await signer();
  const res = await handle(new Request(await google.url(PARAMS)), {
    key: async () => google.spki,
    reward: async () => ({ data: null, error: { message: "down" } }),
  });
  same(res.status, 500);
  await res.body?.cancel();
});

Deno.test("le décodage base64 accepte l'alphabet URL et l'alphabet standard", () => {
  same([...base64UrlDecode("-_8")], [251, 255]);
  same([...base64UrlDecode("+/8=")], [251, 255]);
});
