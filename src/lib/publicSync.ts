import { CARD_COLORS } from '../constants/theme';
import { CLASSIC_TIERS, type Template } from '../constants/presets';
import { popularVoteKey } from '../store/useTierStore';
import type { TierList } from '../store/types';
import { newId } from './id';

/** Library images by concept (public PNG URLs). */
export type IconLibrary = Record<string, string>;

/**
 * Tiers of a public tier list: its own names when it has five (votes are tier indexes
 * 0 to 4, checked by the server), the classic letters otherwise.
 */
export function publicTiers(template: Template): string[] {
  return template.tiers?.length === CLASSIC_TIERS.length ? template.tiers : CLASSIC_TIERS;
}

const sameLabels = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * The player's copy brought up to the public list as it is now: cards added since
 * arrive to rank (the ranking already made stays), the themed tiers replace the
 * letters nobody renamed, and cards with no picture of their own get the library
 * image of their concept. Null when nothing changes, so nothing renders again.
 */
export function syncedCopy(list: TierList, template: Template, icons: IconLibrary): TierList | null {
  const popular = list.popular;
  if (!popular || template.day) return null;
  let changed = false;

  // Cards are found by name: the items of a public list are only ever added to.
  const byLabel = new Map(Object.values(list.cards).map((c) => [c.label, c.id]));
  const cards = { ...list.cards };
  const added: string[] = [];
  const cardIds = template.items.map((label, i) => {
    const known = byLabel.get(label);
    if (known) return known;
    const id = newId();
    cards[id] = { id, label, color: CARD_COLORS[i % CARD_COLORS.length] };
    added.push(id);
    return id;
  });

  cardIds.forEach((id, i) => {
    const card = cards[id];
    const url = icons[template.concepts?.[i] ?? ''];
    if (url && !card.imageName && !card.iconSvg && !card.iconUrl) {
      cards[id] = { ...card, iconUrl: url };
      changed = true;
    }
  });

  const labels = publicTiers(template);
  const relabel = sameLabels(list.tiers.map((t) => t.label), CLASSIC_TIERS) && !sameLabels(labels, CLASSIC_TIERS);
  const tiers = relabel ? list.tiers.map((t, i) => ({ ...t, label: labels[i] })) : list.tiers;

  const voteKey = popularVoteKey(template);
  if (!added.length && !relabel && !changed && voteKey === popular.voteKey && sameLabels(cardIds, popular.cardIds)) return null;

  const pool = [...list.pool, ...added];
  // A ranking validated without the new cards isn't the whole list any more.
  const next = added.length ? { validatedAt: undefined, validatedRanks: undefined, voteSent: undefined } : {};
  return { ...list, cards, tiers, pool, popular: { ...popular, ...next, voteKey, cardIds } };
}



/**
 * The player's copy of a public list, found by its template key: the vote key changes
 * with the cards, the list stays the same. Two copies (one made before the cards
 * changed): the one already up to date, else the last opened.
 */
export function copiesByKey(lists: TierList[], voteKeyOf: (key: string) => string | undefined): Map<string, TierList> {
  const byKey = new Map<string, TierList>();
  for (const l of lists) {
    if (!l.popular) continue;
    const seen = byKey.get(l.popular.key);
    const current = (x: TierList) => x.popular!.voteKey === voteKeyOf(x.popular!.key);
    if (!seen || (current(l) && !current(seen)) || (current(l) === current(seen) && l.openedAt > seen.openedAt)) byKey.set(l.popular.key, l);
  }
  return byKey;
}

/** Every copy of a public list brought up to its list: cards added, tiers, images. */
export function syncAllCopies(
  lists: TierList[],
  templates: Template[],
  icons: IconLibrary,
  sync: (listId: string, template: Template, icons: IconLibrary) => void,
): void {
  const byKey = new Map(templates.map((t) => [t.key, t]));
  for (const l of lists) {
    const template = l.popular && byKey.get(l.popular.key);
    if (template && !template.day) sync(l.id, template, icons);
  }
}
