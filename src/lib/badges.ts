import { useMemo } from 'react';

import { useTierStore } from '../store/useTierStore';
import { setBadges } from './api';
import { completedCount } from './streak';

/**
 * Badges: won on the path of public tier lists, at forks between two divisive
 * choices (pizza or burger…). Choosing one gives up the other for good. Up to 3
 * badges are shown on the player's profile, friends see them too.
 */

/** A badge, drawn as a sticker (see `stickers.ts`); `glow`: its main colour, for halos. */
export type Badge = { id: string; label: string; glow: string };

/** A fork of the path, reached at `at` public lists: two badges, both worth having. */
export type Fork = { id: string; at: number; question: string; options: [Badge, Badge] };

export const FORKS: Fork[] = [
  {
    id: 'food',
    at: 12,
    question: 'Pizza ou burger ?',
    options: [
      { id: 'pizza', label: 'Team Pizza', glow: '#FFB020' },
      { id: 'burger', label: 'Team Burger', glow: '#E39B45' },
    ],
  },
  {
    id: 'pet',
    at: 35,
    question: 'Chien ou chat ?',
    options: [
      { id: 'dog', label: 'Team Chien', glow: '#E0A86C' },
      { id: 'cat', label: 'Team Chat', glow: '#F7A65A' },
    ],
  },
  {
    id: 'sauce',
    at: 60,
    question: 'Ketchup ou mayo ?',
    options: [
      { id: 'ketchup', label: 'Team Ketchup', glow: '#E8352B' },
      { id: 'mayo', label: 'Team Mayo', glow: '#FFE07A' },
    ],
  },
  {
    id: 'holiday',
    at: 90,
    question: 'Mer ou montagne ?',
    options: [
      { id: 'sea', label: 'Team Mer', glow: '#3E9BE8' },
      { id: 'mountain', label: 'Team Montagne', glow: '#6F82B5' },
    ],
  },
  {
    id: 'taste',
    at: 120,
    question: 'Sucré ou salé ?',
    options: [
      { id: 'sweet', label: 'Team Sucré', glow: '#FF7EB3' },
      { id: 'salty', label: 'Team Salé', glow: '#FFD34D' },
    ],
  },
  {
    id: 'drink',
    at: 160,
    question: 'Café ou thé ?',
    options: [
      { id: 'coffee', label: 'Team Café', glow: '#FF7A59' },
      { id: 'tea', label: 'Team Thé', glow: '#9CCB4E' },
    ],
  },
  {
    id: 'rhythm',
    at: 190,
    question: 'Lève-tôt ou couche-tard ?',
    options: [
      { id: 'early', label: 'Lève-tôt', glow: '#FFB020' },
      { id: 'night', label: 'Couche-tard', glow: '#5B5FD6' },
    ],
  },
  {
    id: 'crew',
    at: 240,
    question: 'Pirate ou ninja ?',
    options: [
      { id: 'pirate', label: 'Team Pirate', glow: '#F2C14E' },
      { id: 'ninja', label: 'Team Ninja', glow: '#E8352B' },
    ],
  },
];

const BY_ID = new Map(FORKS.flatMap((f) => f.options.map((b) => [b.id, b] as const)));

export function badgeById(id: string): Badge | undefined {
  return BY_ID.get(id);
}

/** Known badges among `ids` (a friend's app can be newer than this one). */
export function knownBadges(ids: string[] | undefined): Badge[] {
  return (ids ?? []).map(badgeById).filter((b): b is Badge => b !== undefined);
}

/** Forks reached whose badge isn't chosen yet. */
export function pendingForks(completed: number, choices: Record<string, string>): Fork[] {
  return FORKS.filter((f) => completed >= f.at && !choices[f.id]);
}

/** Number of badges waiting to be chosen, for the badges on Profil. */
export function usePendingBadges(): number {
  const lists = useTierStore((s) => s.lists);
  const choices = useTierStore((s) => s.badgeChoices);
  return useMemo(() => pendingForks(completedCount(Object.values(lists)), choices).length, [lists, choices]);
}

/** Sends the badges shown on the profile to the server, for friends to see. */
export function syncBadges(): void {
  const { profile, shownBadges } = useTierStore.getState();
  if (profile) setBadges(profile.secret, shownBadges).catch(() => {});
}

/** Picks a fork's badge (for good) and shows it on the profile if there's room. */
export function chooseBadge(fork: Fork, badge: Badge): void {
  const { badgeChoices } = useTierStore.getState();
  if (badgeChoices[fork.id]) return;
  // Badges of older versions of the app aren't shown any more.
  const shownBadges = useTierStore.getState().shownBadges.filter((id) => badgeById(id));
  useTierStore.setState({
    badgeChoices: { ...badgeChoices, [fork.id]: badge.id },
    shownBadges: shownBadges.length < 3 ? [...shownBadges, badge.id] : shownBadges,
  });
  syncBadges();
}

/**
 * Puts `id` in one of the 3 slots of the profile (null empties it). A badge already
 * shown elsewhere swaps places, so it is never pinned twice.
 */
export function placeBadge(shown: string[], slot: number, id: string | null): string[] {
  if (slot < 0 || slot > 2) return shown.slice(0, 3);
  const slots: (string | null)[] = [0, 1, 2].map((i) => shown[i] ?? null);
  const elsewhere = id ? slots.indexOf(id) : -1;
  if (elsewhere >= 0) slots[elsewhere] = slots[slot];
  slots[slot] = id;
  return slots.filter((s): s is string => s !== null);
}

/** The badges shown on the profile, up to 3. */
export function showBadges(ids: string[]): void {
  useTierStore.setState({ shownBadges: ids.slice(0, 3) });
  syncBadges();
}
