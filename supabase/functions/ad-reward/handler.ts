import { isOurAdUnit, parseCallback, verifySignature } from "./ssv.ts";

/** The rewarded unit of the "Free energy" page (ca-app-pub-6928338731034491/7429871139). */
export const AD_UNIT = "7429871139";

export type Deps = {
  key: (keyId: string) => Promise<string | null>;
  /** public.ad_reward(ticket, transaction_id): 'credited', 'already', 'week'… */
  reward: (ticket: string, transactionId: string) => Promise<{ data: unknown; error: unknown }>;
};

const text = (body: string, status: number) => new Response(body, { status, headers: { "Content-Type": "text/plain" } });

/**
 * AdMob's callback. Anything not signed by Google: 403, nothing touched. Signed: 200 even
 * when nothing is paid (another unit, a stale ticket, the week's ad already paid,
 * AdMob's own "Verify URL" test), since retrying would not change the answer. Only a
 * database failure answers 500.
 */
export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== "GET") return text("method", 405);
  const cb = parseCallback(req.url);
  if (!cb) return text("unsigned", 403);
  const key = await deps.key(cb.keyId);
  if (!key || !(await verifySignature(cb.message, cb.signature, key))) return text("bad signature", 403);
  if (!isOurAdUnit(cb.adUnit, AD_UNIT) || !cb.customData || !cb.transactionId) return text("ignored", 200);
  const { data, error } = await deps.reward(cb.customData, cb.transactionId);
  if (error) {
    console.error("ad_reward", error);
    return text("error", 500);
  }
  return text(String(data), 200);
}
