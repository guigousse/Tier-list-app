import { create } from 'zustand';

import { ANTHRACITE } from '../constants/theme';
import type { Card, TierList } from '../store/types';
import { useTierStore } from '../store/useTierStore';
import { cacheAiIcon } from './aiIconFiles';
import { aiIcons, aiWords } from './api';
import { cardIconFor } from './cardIcons';
import { splitEmoji } from './emoji';

/**
 * AI generation of a tier list's cards, in two steps: the words first (cards added at
 * once, the list named after the theme), then, once the player has checked them, the
 * images of the cards that still have none. Runs outside the screen, so the player
 * can close the window while the images keep coming.
 */

/**
 * Credits a generation costs (docs/monetization-plan.md; 1 credit ≈ 1 cent, 200 credits
 * for 1.99 €). All the images of a list are drawn on one sheet (≈ 12 c€ whatever its
 * size): images cost a fixed part plus a little each, so the more cards get one, the
 * cheaper each image. Small lists lose a little, made up by the icons their free
 * cells draw ahead and by every reused icon.
 */
export const CREDITS = { word: 1, sheet: 2, image: 1 };

export function imageCredits(count: number): number {
  return count > 0 ? CREDITS.sheet + count * CREDITS.image : 0;
}

/** Balance shown while there are no real credits yet (nothing is taken). */
export const TEST_BALANCE = 200;

export function wordCredits(count: number): number {
  return count * CREDITS.word;
}

export type AiJob = {
  listId: string;
  kind: 'words' | 'images';
  phase: 'working' | 'done' | 'error';
  /** Cards added (words), or cards to illustrate (images). */
  cards: number;
  /** Icons received so far. */
  icons: number;
  /** Icons that couldn't be drawn (the card keeps its emoji). */
  failed: number;
  error?: string;
};

/** A generation is under way for this list (only one at a time). */
export function aiBusy(job: AiJob | null, listId: string): boolean {
  return job?.listId === listId && job.phase === 'working';
}

export const useAiJob = create<{ job: AiJob | null }>()(() => ({ job: null }));

const patch = (p: Partial<AiJob>) => {
  const job = useAiJob.getState().job;
  if (job) useAiJob.setState({ job: { ...job, ...p } });
};

/** What to tell the player when generation fails. */
export function aiError(e: unknown): string {
  const m = e instanceof Error ? e.message : '';
  if (m === 'quota') return 'Limite de générations atteinte pour aujourd’hui : réessayez demain.';
  if (m === 'theme refused') return 'Ce thème ne peut pas être généré : essayez-en un autre.';
  if (m === 'busy' || m === 'ai unavailable' || m === 'server') return 'L’IA est indisponible pour le moment : réessayez dans un instant.';
  return 'Pas de connexion : réessayez dans un instant.';
}

export async function generateWords(listId: string, theme: string, count: number): Promise<void> {
  const store = useTierStore.getState();
  const list = store.lists[listId];
  if (!list) return;
  useAiJob.setState({ job: { listId, kind: 'words', phase: 'working', cards: 0, icons: 0, failed: 0 } });
  try {
    const existing = Object.values(list.cards).map((c) => c.label);
    const { cards } = await aiWords(store.deviceId, theme, count, existing);
    cards.forEach((c) => store.addCard(listId, { label: `${c.emoji} ${c.label}`.trim(), color: ANTHRACITE, aiConcept: c.concept || undefined }));
    // The theme asked is the best title the list can have.
    store.renameList(listId, theme);
    patch({ cards: cards.length, phase: 'done' });
  } catch (e) {
    patch({ phase: 'error', error: aiError(e) });
  }
}

/** Cards still without a picture: no photo, no AI icon, no icon drawn in the app. */
export function cardsNeedingImage(list: TierList): Card[] {
  return Object.values(list.cards).filter((c) => !c.imageName && !c.iconUrl && !c.iconSvg && !cardIconFor(splitEmoji(c.label).text));
}

/** Fewest images a generation draws: below that, a sheet costs more than it brings. */
export const MIN_IMAGES = 3;

/** Draws the selected cards that still need an image (at least `MIN_IMAGES`). */
export async function generateImages(listId: string, cardIds: string[]): Promise<void> {
  const store = useTierStore.getState();
  const list = store.lists[listId];
  if (!list) return;
  // All drawn together on one sheet, so they all share the same style.
  const queue = cardsNeedingImage(list).filter((c) => cardIds.includes(c.id));
  if (queue.length < MIN_IMAGES) return;
  useAiJob.setState({ job: { listId, kind: 'images', phase: 'working', cards: queue.length, icons: 0, failed: 0 } });
  try {
    // A card without a concept (added by hand, or renamed): the server draws its label.
    const asked = queue.map((c) => ({ label: splitEmoji(c.label).text, concept: c.aiConcept ?? '' }));
    // The theme gives a homonym its sense: "Rose" is a colour in a list of colours.
    const { icons } = await aiIcons(store.deviceId, asked, list.title);
    queue.forEach((card, i) => {
      const url = icons[i]?.url;
      if (!url) return patch({ failed: (useAiJob.getState().job?.failed ?? 0) + 1 });
      // The card may have been deleted meanwhile.
      if (useTierStore.getState().lists[listId]?.cards[card.id]) useTierStore.getState().updateCard(listId, card.id, { iconUrl: url });
      cacheAiIcon(url);
      patch({ icons: (useAiJob.getState().job?.icons ?? 0) + 1 });
    });
  } catch {
    patch({ failed: queue.length });
  }
  patch({ phase: 'done' });
}
