import { create } from 'zustand';

import { CARD_COLORS } from '../constants/theme';
import { useTierStore } from '../store/useTierStore';
import { cacheAiIcon } from './aiIconFiles';
import { aiIcons, aiWords } from './api';
import { cardIconFor } from './cardIcons';

/**
 * AI generation of a tier list's cards: the words come first (cards added at once),
 * then, if asked, their icons one by one as they're drawn. Runs outside the screen,
 * so the player can close the window while the icons keep coming.
 */

/**
 * Credits a generation costs (docs/monetization-plan.md; 100 credits are meant to sell
 * for 1.99 €). All the images of a list are drawn on one sheet, whose price hardly
 * depends on how many icons it holds: images cost a fixed part plus a little each,
 * so the more cards get one, the cheaper each image.
 */
export const CREDITS = { word: 1, sheet: 12, image: 3 };

export function imageCredits(count: number): number {
  return count > 0 ? CREDITS.sheet + count * CREDITS.image : 0;
}

/** Balance shown while there are no real credits yet (nothing is taken). */
export const TEST_BALANCE = 200;

export function creditCost(count: number, images: boolean): number {
  return count * CREDITS.word + (images ? imageCredits(count) : 0);
}

export type AiJob = {
  listId: string;
  phase: 'words' | 'icons' | 'done' | 'error';
  /** Cards added, and icons received so far. */
  cards: number;
  icons: number;
  /** Icons that couldn't be drawn (the card keeps its emoji). */
  failed: number;
  images: boolean;
  error?: string;
};

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

export async function generateCards(listId: string, theme: string, count: number, images: boolean): Promise<void> {
  const store = useTierStore.getState();
  const list = store.lists[listId];
  if (!list) return;
  useAiJob.setState({ job: { listId, phase: 'words', cards: 0, icons: 0, failed: 0, images } });

  let added: { id: string; label: string; concept: string }[];
  try {
    const existing = Object.values(list.cards).map((c) => c.label);
    const { cards } = await aiWords(store.deviceId, theme, count, existing);
    const start = Object.keys(list.cards).length;
    added = cards.map((c, i) => ({
      id: store.addCard(listId, { label: `${c.emoji} ${c.label}`.trim(), color: CARD_COLORS[(start + i) % 7] }),
      label: c.label,
      concept: c.concept,
    }));
    patch({ cards: added.length, phase: images ? 'icons' : 'done' });
  } catch (e) {
    patch({ phase: 'error', error: aiError(e) });
    return;
  }
  if (!images) return;

  // Cards with an icon already drawn in the app don't need one; the others are drawn
  // together on one sheet, so they all share the same style.
  const queue = added.filter((c) => !cardIconFor(c.label));
  patch({ icons: added.length - queue.length });
  if (queue.length) {
    try {
      const { icons } = await aiIcons(store.deviceId, queue.map(({ label, concept }) => ({ label, concept })));
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
  }
  patch({ phase: 'done' });
}
