export type Tier = {
  id: string;
  label: string;
  color: string;
};

export type Card = {
  id: string;
  label: string;
  color: string;
  /** File name of the picture inside the app's image directory. */
  imageName?: string;
  /** Author and licence of a picture taken from Wikimedia Commons, shown with the card. */
  imageCredit?: string;
};

/** Where a card lives: a tier id, or the unranked tray at the bottom. */
export type Zone = string;
export const POOL: Zone = 'pool';

export type DailyInfo = {
  /** Publication date, e.g. "2026-10-13". */
  day: string;
  emoji: string;
  /** Card ids in the order of the published items, to send the ranking. */
  cardIds: string[];
  /** When the player validated their ranking; it can't change afterwards. */
  validatedAt?: number;
  /** Whether the validated ranking reached the server. */
  voteSent?: boolean;
};

/** Set on a popular tier list: fixed cards, ranking validated and changeable at will. */
export type PopularInfo = {
  /** Template key, e.g. "fruits". */
  key: string;
  /** Statistics key: template key + hash of its cards. */
  voteKey: string;
  /** Card ids in the order of the template items, to send the ranking. */
  cardIds: string[];
  /** Last validation, and the ranking validated then (to spot later changes). */
  validatedAt?: number;
  validatedRanks?: number[];
  /** Whether the last validated ranking reached the server. */
  voteSent?: boolean;
};

export type TierList = {
  id: string;
  title: string;
  /** Emoji shown as the list's preview (daily, popular and template lists). */
  emoji?: string;
  tiers: Tier[];
  cards: Record<string, Card>;
  /** Ordered card ids per tier id. */
  placement: Record<string, string[]>;
  /** Ordered ids of the cards that are not ranked yet. */
  pool: string[];
  favorite: boolean;
  /** Set on the daily tier list: fixed S→D tiers and cards, ranking frozen once validated. */
  daily?: DailyInfo;
  popular?: PopularInfo;
  /** Share code this list was imported from, so opening the same link twice doesn't duplicate it. */
  importedFrom?: string;
  createdAt: number;
  updatedAt: number;
  openedAt: number;
};
