import type { TierList } from '../store/types';
import type { DailyList } from './api';
import type { IconLibrary } from './publicSync';

/**
 * Library images for the cards of a daily list copy (played on its day, or later from the
 * gallery), by card id: each card with no picture of its own takes its concept's image.
 * Empty when there is nothing to add.
 */
export function dailyIcons(list: TierList, dailies: Map<string, DailyList>, icons: IconLibrary): Record<string, string> {
  const day = list.daily?.day ?? (list.popular?.key.startsWith('daily-') ? list.popular.key.slice('daily-'.length) : undefined);
  const daily = day ? dailies.get(day) : undefined;
  const cardIds = list.daily?.cardIds ?? list.popular?.cardIds;
  if (!daily?.concepts || !cardIds) return {};
  const found: Record<string, string> = {};
  cardIds.forEach((id, i) => {
    const card = list.cards[id];
    const url = icons[daily.concepts?.[i] ?? ''];
    if (url && card && !card.imageName && !card.iconSvg && !card.iconUrl) found[id] = url;
  });
  return found;
}
