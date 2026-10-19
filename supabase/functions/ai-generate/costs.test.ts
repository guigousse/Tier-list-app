// deno test supabase/functions/ai-generate/costs.test.ts
import { addClaude, addGemini, costRow, newMeter } from "./costs.ts";

function same(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
}
const near = (a: number, b: number) => {
  if (Math.abs(a - b) > 1e-9) throw new Error(`attendu ${b}, obtenu ${a}`);
};

Deno.test("un appel Claude coûte ses jetons au tarif de son modèle", () => {
  const m = newMeter();
  // Measured on 2026-10-16: 12 cards on Sonnet 5.5, 2 521 tokens in, 416 out ≈ 0.92 ¢ $.
  addClaude(m, "claude-sonnet-5-5", { input_tokens: 2521, output_tokens: 416 });
  near(m.costUsd, (2521 * 2 + 416 * 10) / 1e6);
  // Opus costs twice as much for the same tokens.
  const o = newMeter();
  addClaude(o, "claude-opus-5-5", { input_tokens: 2521, output_tokens: 416 });
  near(o.costUsd, 2 * m.costUsd);
  same([m.calls, m.inputTokens, m.outputTokens], [1, 2521, 416]);
});

Deno.test("un modèle inconnu (repli du serveur) est compté au tarif le plus cher, jamais à zéro", () => {
  const m = newMeter();
  addClaude(m, "claude-mystery-9", { input_tokens: 1_000_000, output_tokens: 0 });
  near(m.costUsd, 10);
});

Deno.test("les jetons lus ou écrits en cache comptent aussi", () => {
  const m = newMeter();
  addClaude(m, "claude-sonnet-5-5", { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000 });
  // Read at 0.1×, written at 1.25× the input price.
  near(m.costUsd, 0.2 + 2.5);
});

Deno.test("une planche Gemini coûte surtout ses jetons d'image", () => {
  const m = newMeter();
  // A 1K sheet: ≈ 1 120 image tokens at 60 $ the million ≈ 6.7 ¢ $, as measured (6.8).
  addGemini(m, { promptTokenCount: 600, candidatesTokenCount: 1120, candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1120 }] });
  near(m.costUsd, (600 * 0.5 + 1120 * 60) / 1e6);
  same([m.calls, m.inputTokens, m.outputTokens], [1, 600, 1120]);
  // Thinking and text are paid at the text rate.
  const t = newMeter();
  addGemini(t, { promptTokenCount: 0, candidatesTokenCount: 1200, thoughtsTokenCount: 100, candidatesTokensDetails: [{ modality: "IMAGE", tokenCount: 1120 }, { modality: "TEXT", tokenCount: 80 }] });
  near(t.costUsd, (1120 * 60 + 180 * 3) / 1e6);
});

Deno.test("sans détail par modalité, toute la sortie est comptée comme image (le cas le plus cher)", () => {
  const m = newMeter();
  addGemini(m, { promptTokenCount: 0, candidatesTokenCount: 1000 });
  near(m.costUsd, 1000 * 60 / 1e6);
  // No usage at all: still one call, at the measured price of a 1K sheet.
  const n = newMeter();
  addGemini(n, undefined);
  near(n.costUsd, 0.068);
});

Deno.test("une génération donne une ligne de journal : coût réel et crédits encaissés", () => {
  const m = newMeter();
  addClaude(m, "claude-sonnet-5-5", { input_tokens: 2521, output_tokens: 416 });
  same(costRow("words", m, 3, true), { kind: "words", calls: 1, input_tokens: 2521, output_tokens: 416, cost_usd: 0.009202, credits: 3, ok: true });
});
