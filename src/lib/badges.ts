import { useMemo } from 'react';

import { useTierStore } from '../store/useTierStore';
import { setBadges } from './api';
import { completedCount } from './streak';

/**
 * Badges: won on the path of public tier lists, at forks between two divisive
 * choices (pizza or burger…). Choosing one gives up the other for good. Up to 3
 * badges are shown on the player's profile, friends see them too.
 */

export type Badge = { id: string; emoji: string; label: string; colors: [string, string] };

/** A fork of the path, reached at `at` public lists. */
export type Fork = { id: string; at: number; question: string; options: [Badge, Badge] };

export const FORKS: Fork[] = [
  {
    id: 'food',
    at: 2,
    question: 'Pizza ou burger ?',
    options: [
      { id: 'pizza', emoji: '🍕', label: 'Team Pizza', colors: ['#FFB36B', '#E2462B'] },
      { id: 'burger', emoji: '🍔', label: 'Team Burger', colors: ['#FFD36E', '#B4662E'] },
    ],
  },
  {
    id: 'pet',
    at: 7,
    question: 'Chien ou chat ?',
    options: [
      { id: 'dog', emoji: '🐶', label: 'Team Chien', colors: ['#E6B98A', '#9C6338'] },
      { id: 'cat', emoji: '🐱', label: 'Team Chat', colors: ['#FFC9A6', '#E07A4F'] },
    ],
  },
  {
    id: 'pastry',
    at: 12,
    question: 'Pain au chocolat ou chocolatine ?',
    options: [
      { id: 'painauchoc', emoji: '🍫', label: 'Pain au chocolat', colors: ['#B07A55', '#5B3A24'] },
      { id: 'chocolatine', emoji: '🥐', label: 'Chocolatine', colors: ['#FFD98A', '#D08A2E'] },
    ],
  },
  {
    id: 'holiday',
    at: 20,
    question: 'Mer ou montagne ?',
    options: [
      { id: 'sea', emoji: '🌊', label: 'Team Mer', colors: ['#7FD3FF', '#2A7BD5'] },
      { id: 'mountain', emoji: '🏔️', label: 'Team Montagne', colors: ['#B9E4C9', '#3E8E66'] },
    ],
  },
  {
    id: 'pineapple',
    at: 30,
    question: 'De l’ananas sur la pizza ?',
    options: [
      { id: 'pineapple-yes', emoji: '🍍', label: 'Ananas forever', colors: ['#FFE66B', '#E0A21B'] },
      { id: 'pineapple-no', emoji: '🚫', label: 'Jamais d’ananas', colors: ['#FF8A8A', '#C92F3D'] },
    ],
  },
  {
    id: 'drink',
    at: 45,
    question: 'Café ou thé ?',
    options: [
      { id: 'coffee', emoji: '☕', label: 'Team Café', colors: ['#C8A27A', '#6B4226'] },
      { id: 'tea', emoji: '🍵', label: 'Team Thé', colors: ['#C6EBA0', '#5E9E3A'] },
    ],
  },
  {
    id: 'rhythm',
    at: 60,
    question: 'Lève-tôt ou couche-tard ?',
    options: [
      { id: 'early', emoji: '🌅', label: 'Lève-tôt', colors: ['#FFE0A3', '#FF8A3D'] },
      { id: 'night', emoji: '🦉', label: 'Couche-tard', colors: ['#9E8CFF', '#3B2C8F'] },
    ],
  },
  {
    id: 'phone',
    at: 85,
    question: 'Pomme ou robot ?',
    options: [
      { id: 'apple', emoji: '🍎', label: 'Team Pomme', colors: ['#E9EDF2', '#8A94A6'] },
      { id: 'robot', emoji: '🤖', label: 'Team Robot', colors: ['#B5F0A8', '#3DAA5C'] },
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
  const { badgeChoices, shownBadges } = useTierStore.getState();
  if (badgeChoices[fork.id]) return;
  useTierStore.setState({
    badgeChoices: { ...badgeChoices, [fork.id]: badge.id },
    shownBadges: shownBadges.length < 3 ? [...shownBadges, badge.id] : shownBadges,
  });
  syncBadges();
}

/** The badges shown on the profile, up to 3. */
export function showBadges(ids: string[]): void {
  useTierStore.setState({ shownBadges: ids.slice(0, 3) });
  syncBadges();
}
