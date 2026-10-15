// App Store Server Notifications V2, the URL set in App Store Connect (production and
// sandbox): refunds of energy packs (../ai-generate/refunds.ts).
//   CONSUMPTION_REQUEST  a player asks Apple for a refund: Apple is told how much of the
//                        pack was spent, and prefers refusing what was used up
//   REFUND               Apple refunded anyway: the pack is taken back, the spent part
//                        as a debt (wallet_refund)
//   REFUND_REVERSED      Apple cancels the refund: the pack is given back
//   TEST                 asked for through the App Store Server API, to check the URL
// Apple sends a notification again until it gets a 200, so each branch can run twice.
// Secrets: APPSTORE_IAP_KEY (the .p8 of an In-App Purchase key), APPSTORE_IAP_KEY_ID,
// APPSTORE_ISSUER_ID; without them refunds are still taken back, only the answer to
// consumption requests is skipped.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

import { consumptionInfo, readNotification, sendConsumption, type ServerApiKey } from "../ai-generate/refunds.ts";

const BUNDLE = "com.guigousse.TierCraft";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function apiKey(): ServerApiKey | null {
  const key = Deno.env.get("APPSTORE_IAP_KEY"), keyId = Deno.env.get("APPSTORE_IAP_KEY_ID"), issuerId = Deno.env.get("APPSTORE_ISSUER_ID");
  return key && keyId && issuerId ? { key, keyId, issuerId, bundleId: BUNDLE } : null;
}

const done = (status = 200) => new Response(null, { status });

Deno.serve(async (req) => {
  if (req.method !== "POST") return done(405);
  let n;
  try {
    const { signedPayload } = await req.json();
    n = await readNotification(String(signedPayload ?? ""), { bundleId: BUNDLE });
  } catch (e) {
    console.error("notification", e instanceof Error ? e.message : e);
    return done(400);
  }

  if (n.type === "TEST") {
    console.log("test notification", n.environment);
  } else if (n.type === "REFUND") {
    const { data, error } = await db.rpc("wallet_refund", { transaction_id: n.transactionId });
    if (error) return console.error("refund", error.message), done(500);
    console.log("refund", n.transactionId, JSON.stringify(data));
  } else if (n.type === "REFUND_REVERSED") {
    const { error } = await db.rpc("wallet_refund_reversed", { transaction_id: n.transactionId });
    if (error) return console.error("refund reversed", error.message), done(500);
  } else if (n.type === "CONSUMPTION_REQUEST") {
    const { data, error } = await db.rpc("purchase_state", { transaction_id: n.transactionId });
    if (error) return console.error("consumption", error.message), done(500);
    const row = (data as { credits: number; balance: number }[] | null)?.[0];
    const key = apiKey();
    if (!row) console.error("consumption: unknown purchase", n.transactionId);
    else if (!key) console.error("consumption: no In-App Purchase key in the secrets");
    else {
      try {
        await sendConsumption(key, n.environment, n.transactionId, consumptionInfo(row.credits, row.balance));
      } catch (e) {
        // A 500 makes Apple send it again: there are 12 hours to answer.
        console.error("consumption", e instanceof Error ? e.message : e);
        return done(500);
      }
    }
  }
  return done();
});
