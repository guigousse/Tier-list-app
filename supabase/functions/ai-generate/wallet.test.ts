// deno test supabase/functions/ai-generate/wallet.test.ts
import { paid, type Rpc, WalletError } from "./wallet.ts";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

/** The database's wallet functions, in memory, logging every call. */
function fakeDb(balance: number) {
  const calls: string[] = [];
  const holds = new Map<number, number>();
  const rpc: Rpc = async (fn, args) => {
    calls.push(`${fn}(${JSON.stringify(args)})`);
    if (fn === "wallet_hold") {
      const amount = args.amount as number;
      if (amount > balance) return { data: null, error: { message: "credits" } };
      balance -= amount;
      holds.set(holds.size + 1, amount);
      return { data: holds.size, error: null };
    }
    if (fn === "wallet_settle") {
      balance += holds.get(args.hold as number)! - (args.used as number);
      return { data: balance, error: null };
    }
    return { data: null, error: { message: "unknown" } };
  };
  return { rpc, calls, balance: () => balance };
}

Deno.test("une génération réserve le maximum puis ne garde que ce qui est livré", async () => {
  const db = fakeDb(50);
  const out = await paid(db.rpc, "secret", "images", 10, async () => ({ delivered: 6, value: "ok" }));
  same(out, { value: "ok", balance: 36, charged: 14 });
  same(db.calls, ['wallet_hold({"secret":"secret","amount":18,"reason":"images"})', 'wallet_settle({"hold":1,"used":14})']);
});

Deno.test("un échec rend tout ce qui avait été réservé", async () => {
  const db = fakeDb(50);
  let thrown = "";
  try {
    await paid(db.rpc, "secret", "words", 10, async () => {
      throw new Error("ai unavailable");
    });
  } catch (e) {
    thrown = (e as Error).message;
  }
  same(thrown, "ai unavailable");
  same(db.balance(), 50);
});

Deno.test("sans assez de crédits, l'IA n'est même pas appelée", async () => {
  const db = fakeDb(5);
  let called = false;
  let error: unknown;
  try {
    await paid(db.rpc, "secret", "words", 10, async () => {
      called = true;
      return { delivered: 10, value: null };
    });
  } catch (e) {
    error = e;
  }
  same(called, false);
  same(error instanceof WalletError && error.code, "credits");
});

Deno.test("plus livré que réservé ne coûte pas plus que la réserve", async () => {
  const db = fakeDb(50);
  const out = await paid(db.rpc, "secret", "tiers", 3, async () => ({ delivered: 7, value: null }));
  same(out.charged, 3);
});

Deno.test("un porte-monnaie bloqué après des remboursements le dit, sans appeler l'IA", async () => {
  const rpc: Rpc = async () => ({ data: null, error: { message: "blocked" } });
  let ran = false;
  try {
    await paid(rpc, "secret", "words", 5, async () => {
      ran = true;
      return { delivered: 5, value: null };
    });
  } catch (e) {
    same([e instanceof WalletError && e.code, ran], ["blocked", false]);
    return;
  }
  throw new Error("aurait dû être refusé");
});
