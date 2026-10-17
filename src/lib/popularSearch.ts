import type { Template } from '../constants/presets';
import type { TierList } from '../store/types';
import { listTheme } from './themes';

export type PopularFilter = 'all' | 'favorites' | 'todo' | 'started' | 'validated';

/** Lower case, without accents, for searching. */
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const isValidated = (list: TierList | undefined) => Boolean(list?.popular?.validatedAt ?? list?.daily?.validatedAt);

/**
 * The searchable text of every list (title and cards), folded once: with up to 366 past
 * daily lists, folding them all again at every key typed was felt.
 */
export function searchIndex(templates: Template[]): Map<string, string> {
  return new Map(templates.map((t) => [t.key, fold([t.title, ...t.items].join(' '))]));
}

/** The popular lists shown for a search, a filter and an order. */
export function popularShown({
  templates,
  index,
  copies,
  favorites,
  query,
  filter,
  sort,
  theme,
  tags = {},
}: {
  templates: Template[];
  index: Map<string, string>;
  copies: (t: Template) => TierList | undefined;
  favorites: string[];
  query: string;
  filter: PopularFilter;
  sort: 'popular' | 'title';
  /** A grand theme opened in the gallery: its lists only (placed by their tags if need be). */
  theme?: string;
  tags?: Record<string, string[]>;
}): Template[] {
  const q = fold(query.trim());
  const result = templates.filter((t) => {
    if (theme && listTheme(t, tags[t.key]) !== theme) return false;
    if (q && !(index.get(t.key) ?? '').includes(q)) return false;
    const copy = copies(t);
    switch (filter) {
      case 'favorites':
        return favorites.includes(t.key);
      case 'todo':
        return !copy;
      case 'started':
        return Boolean(copy && !isValidated(copy));
      case 'validated':
        return isValidated(copy);
      default:
        return true;
    }
  });
  return sort === 'title' ? [...result].sort((a, b) => a.title.localeCompare(b.title, 'fr')) : result;
}
