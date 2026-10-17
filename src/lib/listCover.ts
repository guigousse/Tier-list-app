import type { Template } from '../constants/presets';
import { splitEmoji } from './emoji';

/**
 * The picture of a public list in the catalogue: its favourite card (the one players
 * rank S most often, `tops` from the server), drawn from the library. Until it is drawn,
 * that card's emoji; with no vote yet, the first card already drawn; with nothing at all,
 * the list's emoji.
 */
export function listCover(template: Template, tops: Record<string, number>, icons: Record<string, string>): { url?: string; emoji: string } {
  const emojiOf = (i: number) => splitEmoji(template.items[i] ?? '').emoji ?? template.emoji;
  const urlOf = (i: number) => icons[template.concepts?.[i] ?? ''] as string | undefined;
  const top = tops[template.key];
  if (top !== undefined && top >= 0 && top < template.items.length) return { url: urlOf(top), emoji: emojiOf(top) };
  const drawn = template.items.findIndex((_, i) => urlOf(i));
  return drawn >= 0 ? { url: urlOf(drawn), emoji: emojiOf(drawn) } : { url: undefined, emoji: template.emoji };
}
