import type { Template } from '../constants/presets';

/**
 * Discovery of popular tier lists: what's trending, and what this player might
 * like. Each list has hidden theme tags (food, travel, pop-culture…) kept online.
 */

export type Discovery = {
  /** Theme tags by list key (template key, or "daily-YYYY-MM-DD"). */
  tags: Record<string, string[]>;
  /** Trend score by list key: recent views, completed rankings and favourites. */
  trends: Record<string, number>;
};

/** Lists not done yet first, keeping their order; the ones done follow. */
function undoneFirst(templates: Template[], isDone: (t: Template) => boolean): Template[] {
  return [...templates.filter((t) => !isDone(t)), ...templates.filter(isDone)];
}

/** Trending lists: the last days' activity, then all-time popularity. */
export function trending(
  templates: Template[],
  discovery: Discovery,
  popularity: (key: string) => number,
  isDone: (t: Template) => boolean,
): Template[] {
  const score = (t: Template) => discovery.trends[t.key] ?? 0;
  const sorted = templates
    .map((t, i) => ({ t, i }))
    .sort((a, b) => score(b.t) - score(a.t) || popularity(b.t.key) - popularity(a.t.key) || a.i - b.i)
    .map(({ t }) => t);
  return undoneFirst(sorted, isDone);
}

/**
 * Lists the player might like: the themes of the lists they completed (and their
 * favourites) give each tag a weight; a list scores the weights of its tags, a bit
 * of popularity breaking ties. Lists already done come last. Without any history,
 * the trends.
 */
export function forYou(
  templates: Template[],
  discovery: Discovery,
  popularity: (key: string) => number,
  isDone: (t: Template) => boolean,
  favorites: string[],
): Template[] {
  const weights = new Map<string, number>();
  const learn = (key: string, weight: number) => {
    const tags = discovery.tags[key] ?? [];
    // Spread over the list's tags: a list with many tags doesn't weigh more.
    for (const tag of tags) weights.set(tag, (weights.get(tag) ?? 0) + weight / Math.sqrt(tags.length));
  };
  for (const t of templates) if (isDone(t)) learn(t.key, 1);
  for (const key of favorites) learn(key, 1.5);
  if (weights.size === 0) return trending(templates, discovery, popularity, isDone);

  const score = (t: Template) => {
    const tags = discovery.tags[t.key] ?? [];
    const affinity = tags.reduce((sum, tag) => sum + (weights.get(tag) ?? 0), 0) / Math.sqrt(Math.max(1, tags.length));
    return affinity + 0.15 * Math.log1p(popularity(t.key)) + 0.1 * Math.log1p(discovery.trends[t.key] ?? 0);
  };
  const sorted = templates
    .map((t, i) => ({ t, i, s: score(t) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map(({ t }) => t);
  return undoneFirst(sorted, isDone);
}
