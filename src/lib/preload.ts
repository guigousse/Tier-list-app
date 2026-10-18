import type { Template } from '../constants/presets';
import { cacheAiIcon } from './aiIconFiles';
import { listCover } from './listCover';

/** The picture of every public list (its favourite card), each once. */
export function coverUrls(templates: Template[], tops: Record<string, number>, icons: Record<string, string>): string[] {
  return [...new Set(templates.map((t) => listCover(t, tops, icons).url).filter((u): u is string => Boolean(u)))];
}

/** The picture of every card of these lists (those already drawn), each once. */
export function cardUrls(templates: Template[], icons: Record<string, string>): string[] {
  return [...new Set(templates.flatMap((t) => (t.concepts ?? []).map((c) => icons[c])).filter((u): u is string => Boolean(u)))];
}

/**
 * Copies the pictures of the public lists to the device ahead (right after the catalogue
 * loads): opening the public lists then shows them from the device at once, rather than
 * each one appearing as it downloads. A few at a time, so the rest of the app isn't held up.
 */
export async function preloadCovers(urls: string[], atOnce = 4): Promise<void> {
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: Math.min(atOnce, queue.length) }, async () => {
      for (let url = queue.shift(); url; url = queue.shift()) await cacheAiIcon(url);
    }),
  );
}
