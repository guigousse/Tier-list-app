// What the app sends is bounded and cleaned before it reaches a model: its size sets
// the bill (a paid generation has a fixed price), and its text ends up inside prompts.

/** Largest request accepted: a full list of cards fits several times over. */
export const MAX_BODY = 32 * 1024;

/** A list of texts from the app: at most `items` of them, each cut to `length`. */
export function texts(raw: unknown, items: number, length: number): string[] {
  return (Array.isArray(raw) ? raw : []).slice(0, items).map((s) => String(s).slice(0, length));
}

/**
 * A player's text inside a prompt: one line, without double quotes, so it can't close the
 * quotes around it nor start an instruction of its own.
 */
export function promptSafe(s: string): string {
  return s
    .replace(/"/g, "'")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The shared library (card_icons) only takes drawings of concepts the AI proposed
 * (icon_wishlist), drawn from the AI's own label and without the player's theme: a card
 * named by hand can't put a picture of its making in every player's lists. Other cards
 * are still drawn, for the player who asked only.
 */
export function trustForLibrary<T extends { concept: string; label: string; theme?: string }>(
  cards: T[],
  wishlist: Map<string, string>,
): { cards: T[]; shared: Set<string> } {
  const shared = new Set<string>();
  const out = cards.map((c) => {
    const label = wishlist.get(c.concept);
    if (label === undefined) return c;
    shared.add(c.concept);
    return { ...c, label, theme: undefined };
  });
  return { cards: out, shared };
}

/**
 * The key a wallet's daily AI quota is counted under (ai_usage.device_id, a uuid): the
 * first 16 bytes of the SHA-256 of its secret, so the secret itself is never stored.
 */
export async function quotaKey(wallet: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(wallet)));
  const hex = [...hash.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
