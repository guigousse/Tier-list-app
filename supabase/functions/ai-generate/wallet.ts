// Paying for a generation with the player's credits (supabase/migrations/*_credits.sql).
// The price comes from pricing.ts, on the server: the app never names one.
import { charge, type Paid } from "./pricing.ts";

/** The database's functions, as supabase-js calls them (db.rpc). */
export type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

/**
 * "credits": not enough of them; "wallet": no wallet for this secret; "blocked": refunded
 * twice after spending its energy (wallet_refund), no more generations.
 */
export class WalletError extends Error {
  constructor(public code: "credits" | "wallet" | "blocked") {
    super(code);
  }
}

const reason = (message: string) =>
  message.includes("credits") ? "credits" : message.includes("blocked") ? "blocked" : message.includes("wallet") ? "wallet" : null;

/**
 * Runs a generation that delivers at most `max` items: holds their price first (so an
 * empty wallet never reaches the AI, and two requests at once can't spend the same
 * credits), then keeps only the price of what `run` delivered. A failure gives back the
 * whole hold; a request that dies outright is given back by the database after 10 min.
 */
export async function paid<T>(
  rpc: Rpc,
  secret: string,
  kind: Paid,
  max: number,
  run: () => Promise<{ delivered: number; value: T }>,
): Promise<{ value: T; balance: number; charged: number }> {
  const amount = charge(kind, max);
  const hold = await rpc("wallet_hold", { secret, amount, reason: kind });
  if (hold.error) {
    const code = reason(hold.error.message);
    if (code) throw new WalletError(code);
    throw new Error(`wallet_hold: ${hold.error.message}`);
  }
  let result: { delivered: number; value: T };
  try {
    result = await run();
  } catch (e) {
    await rpc("wallet_settle", { hold: hold.data, used: 0 });
    throw e;
  }
  const charged = Math.min(amount, charge(kind, result.delivered));
  const settled = await rpc("wallet_settle", { hold: hold.data, used: charged });
  return { value: result.value, balance: Number(settled.data), charged };
}
