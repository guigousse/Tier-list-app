// What each generation really costs us, from the tokens Anthropic and Google bill, so
// that the margin of every generation can be watched (table ai_costs, function
// ai_margin, the daily ai_cost_watch that warns the owner when it shrinks). The rates
// are kept with the tokens: if a price changes, the costs can be recomputed.

export type Meter = { calls: number; inputTokens: number; outputTokens: number; costUsd: number };

export const newMeter = (): Meter => ({ calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 });

/** Anthropic, $ per million tokens (2026-10-16). */
export const CLAUDE_RATES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};
/** A model not listed (a server-side fallback answered): priced as the dearest tier, never as free. */
const UNKNOWN_CLAUDE = { input: 10, output: 50 };

/**
 * Gemini 3.1 Flash Image, $ per million tokens. Image output at 60 $: a 1K sheet is
 * ≈ 1 120 tokens, ≈ 6.7 ¢ $, as measured (6.8 ¢ $). Input and text were found quoted at
 * 0.25 and 1.5 $; the higher figures seen elsewhere (0.5, 3) are kept, to err on the dear side.
 */
export const GEMINI_RATES = { input: 0.5, image: 60, text: 3 };
/** A sheet whose answer carried no usage: its measured price. */
const SHEET_MEASURED_USD = 0.068;

type ClaudeUsage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };

export function addClaude(m: Meter, model: string, usage: ClaudeUsage) {
  const rate = CLAUDE_RATES[model] ?? UNKNOWN_CLAUDE;
  const read = usage.cache_read_input_tokens ?? 0;
  const written = usage.cache_creation_input_tokens ?? 0;
  m.calls++;
  m.inputTokens += usage.input_tokens + read + written;
  m.outputTokens += usage.output_tokens;
  // Cache reads cost 0.1× the input price, cache writes 1.25×.
  m.costUsd += (usage.input_tokens * rate.input + read * rate.input * 0.1 + written * rate.input * 1.25 + usage.output_tokens * rate.output) / 1e6;
}

type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  candidatesTokensDetails?: { modality?: string; tokenCount?: number }[];
};

export function addGemini(m: Meter, usage: GeminiUsage | undefined) {
  m.calls++;
  if (!usage) {
    m.costUsd += SHEET_MEASURED_USD;
    return;
  }
  const input = usage.promptTokenCount ?? 0;
  const output = usage.candidatesTokenCount ?? 0;
  const thoughts = usage.thoughtsTokenCount ?? 0;
  const details = usage.candidatesTokensDetails;
  // Without the split by modality, all the output is counted as image, the dear case.
  const image = details ? details.filter((d) => d.modality === "IMAGE").reduce((s, d) => s + (d.tokenCount ?? 0), 0) : output;
  const text = output - image + thoughts;
  m.inputTokens += input;
  m.outputTokens += output + thoughts;
  m.costUsd += (input * GEMINI_RATES.input + image * GEMINI_RATES.image + text * GEMINI_RATES.text) / 1e6;
}

export type CostKind = "words" | "tiers" | "images";

/** The journal line of one generation: what it cost us, what the player paid. */
export function costRow(kind: CostKind, m: Meter, credits: number, ok: boolean) {
  return {
    kind,
    calls: m.calls,
    input_tokens: m.inputTokens,
    output_tokens: m.outputTokens,
    cost_usd: Math.round(m.costUsd * 1e6) / 1e6,
    credits,
    ok,
  };
}
