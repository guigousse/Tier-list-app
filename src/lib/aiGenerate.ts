import { create } from 'zustand';

import { CARD_COLORS } from '../constants/theme';
import { useTierStore } from '../store/useTierStore';
import { aiIcon, aiWords } from './api';
import { cardIconFor } from './cardIcons';

/**
 * AI generation of a tier list's cards: the words come first (cards added at once),
 * then, if asked, their icons one by one as they're drawn. Runs outside the screen,
 * so the player can close the window while the icons keep coming.
 */

/**
 * Credits a generation costs. Scale from docs/monetization-plan.md: a new icon costs
 * ~40 times a card name to draw, and 100 credits are meant to sell for 1.99 €.
 */
export const CREDITS = { word: 1, image: 8 };

/** Balance shown while there are no real credits yet (nothing is taken). */
export const TEST_BALANCE = 200;

export function creditCost(count: number, images: boolean): number {
  return count * CREDITS.word + (images ? count * CREDITS.image : 0);
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

/** Icons drawn at the same time (the server answers each in several seconds). */
const PARALLEL = 3;

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

  // Cards with an icon already drawn in the app don't need one.
  const queue = added.filter((c) => !cardIconFor(c.label));
  patch({ icons: added.length - queue.length });
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      try {
        const { svg } = await aiIcon(useTierStore.getState().deviceId, next.label, next.concept);
        // The card may have been deleted meanwhile.
        if (useTierStore.getState().lists[listId]?.cards[next.id]) useTierStore.getState().updateCard(listId, next.id, { iconSvg: svg });
        patch({ icons: (useAiJob.getState().job?.icons ?? 0) + 1 });
      } catch {
        patch({ failed: (useAiJob.getState().job?.failed ?? 0) + 1 });
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  patch({ phase: 'done' });
}
