// A referral claimed by the app once a player ranked a challenge opened from a share code.
//   { wallet, deviceId, code, deviceToken?, development? } -> { status }
// status: claim_challenge's ('credited' | 'already' | 'own' | 'not_new' | 'cap' | 'unknown'),
// or 'device_used' (Apple's bit0: this iPhone was already sponsored, even before a reinstall),
// or 'retry' (Apple could not be asked: nothing claimed, the app asks again later).
// The only way to claim: claim_challenge is no longer executable by anon (see
// 20261020040000_referral_devicecheck.sql), so a referral always goes past DeviceCheck.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

import { decideClaim } from "./claim.ts";
import { deviceCheckJwt, importP8, queryBit0, setBit0 } from "./deviceCheck.ts";

const TEAM_ID = "9D78779LKL";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[A-Za-z0-9]{4,12}$/;

let keyPromise: Promise<CryptoKey> | null = null;
/** The .p8 key, imported once per instance; null when the secrets are missing. */
async function appleJwt(): Promise<string | null> {
  const p8 = Deno.env.get("DEVICECHECK_KEY"), keyId = Deno.env.get("DEVICECHECK_KEY_ID");
  if (!p8 || !keyId) return null;
  keyPromise ??= importP8(p8);
  return deviceCheckJwt(await keyPromise, keyId, TEAM_ID);
}

/** The player's address, so claim_challenge's rate limit counts per player and not for this function. */
function clientIp(req: Request): string {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 8000) return json({ error: "too large" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const wallet = typeof body?.wallet === "string" ? body.wallet : "";
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : "";
  const code = typeof body?.code === "string" ? body.code : "";
  const token = typeof body?.deviceToken === "string" ? body.deviceToken : "";
  if (wallet.length < 32 || !UUID.test(deviceId) || !CODE.test(code) || token.length > 4000) {
    return json({ error: "bad request" }, 400);
  }

  try {
    let jwt: string | null = null;
    if (token) {
      jwt = await appleJwt();
      if (!jwt) {
        console.error("devicecheck: DEVICECHECK_KEY or DEVICECHECK_KEY_ID missing");
        return json({ status: "retry" });
      }
    }
    const call = { jwt: jwt ?? "", development: body.development === true };
    const ip = clientIp(req);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      global: { headers: ip ? { "x-client-ip": ip } : {} },
    });
    const status = await decideClaim(token, {
      queryBits: (t) => queryBit0(t, call),
      claim: async () => {
        const { data, error } = await db.rpc("claim_challenge", { wallet, device_id: deviceId, code });
        if (error) throw new Error(error.message);
        return String((data as { status?: unknown })?.status ?? "unknown");
      },
      setBit0: (t, bit1) => setBit0(t, bit1, call),
    });
    return json({ status });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("too many requests")) return json({ error: "too many requests" }, 429);
    console.error("referral-claim", message);
    return json({ error: "unavailable" }, 503);
  }
});
