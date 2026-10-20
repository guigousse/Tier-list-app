// AdMob's server-side verification callback for the rewarded ad of the "Free energy"
// page (verify_jwt off: Google calls without a Supabase token; the ECDSA signature is
// the proof). The ad carries a ticket from public.ad_ticket as its custom data; a
// callback signed by Google redeems it for 5 credits (private.ad_credit, once a week).
// URL to give AdMob: https://mefhdtpyhtvplpfleyhi.supabase.co/functions/v1/ad-reward
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

import { handle } from "./handler.ts";
import { keyStore } from "./ssv.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const key = keyStore();

Deno.serve((req) =>
  handle(req, {
    key,
    reward: async (ticket, transactionId) => await db.rpc("ad_reward", { ticket, transaction_id: transactionId }),
  })
);
