import type { TierList } from '../store/types';

/** Daily, popular, received and challenge tier lists have fixed tiers and cards: only the ranking changes. */
export const isFixed = (list: TierList) => Boolean(list.daily || list.popular || list.mail || list.challenge);

/** The player's own lists open in edit mode when just created, or empty (nothing to rank yet). */
export const startsEditing = (list: TierList, startEditing: boolean) =>
  !isFixed(list) && (startEditing || Object.keys(list.cards).length === 0);

/**
 * Cards are placed in ranking mode only: editing is for the title, tiers and cards
 * themselves. A received list is frozen too once its ranking was sent back, a challenge once validated.
 */
export const placementLocked = (list: TierList, editing: boolean) => editing || Boolean(list.mail?.answeredAt || list.challenge?.answeredAt);
