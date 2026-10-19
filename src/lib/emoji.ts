/**
 * One emoji at the start of a text: a pictograph with its variation selectors and
 * zero-width-joined parts (👨‍🍳, ☀️), or a flag (two regional indicators, 🇫🇷).
 */
const LEADING_EMOJI = /^(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*️?)/u;

/** Leading emoji of a card label like "🍕 Pizza" or "🇫🇷 France", if any. */
export function leadingEmoji(label: string): string | undefined {
  return label.match(LEADING_EMOJI)?.[0];
}

/** Splits "🍕 Pizza" into its emoji and the rest of the text. */
export function splitEmoji(label: string): { emoji?: string; text: string } {
  const emoji = leadingEmoji(label);
  return emoji ? { emoji, text: label.slice(emoji.length).trim() } : { text: label };
}
