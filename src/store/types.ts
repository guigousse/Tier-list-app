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
};

/** Where a card lives: a tier id, or the unranked tray at the bottom. */
export type Zone = string;
export const POOL: Zone = 'pool';

export type TierList = {
  id: string;
  title: string;
  tiers: Tier[];
  cards: Record<string, Card>;
  /** Ordered card ids per tier id. */
  placement: Record<string, string[]>;
  /** Ordered ids of the cards that are not ranked yet. */
  pool: string[];
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  openedAt: number;
};
