import { create } from 'zustand';

import { ANTHRACITE } from '../constants/theme';
import type { Card, TierList } from '../store/types';
import { useTierStore } from '../store/useTierStore';
import { cacheAiIcon } from './aiIconFiles';
import { aiIcons, aiTiers, aiWords } from './api';
import { creditsError, setBalance, walletForRequest } from './credits';
import { cardIconFor } from './cardIcons';
import { splitEmoji } from './emoji';

/**
 * AI generation of a tier list's cards, in two steps: the words first (cards added at
 * once, the list named after the theme), then, once the player has checked them, the
 * images of the cards that still have none. Runs outside the screen, so the player
 * can close the window while the images keep coming.
 */

/**
 * Credits a generation costs (docs/monetization-plan.md; 1 credit ≈ 1 cent). All the
 * images of a list are drawn on one sheet (≈ 6 c€ whatever its size): images cost a
 * fixed part plus a little each, so the more cards get one, the cheaper each image.
 * Measured, a 5-card illustrated list pays for itself even with no icon reused.
 */
export const CREDITS = { word: 1, tier: 1, sheet: 8, image: 1 };
/** Cards written in one generation are paid 5 at most (supabase/functions/ai-generate/pricing.ts). */
export const WORDS_CAP = 5;

/** Icons on one sheet: beyond 20, Gemini's cells get too small to read (server: sheet.ts). */
export const SHEET_MAX = 20;

/**
 * The sheets `count` images are drawn on: as few as possible, of even sizes (26 → 13 +
 * 13, not 20 + 6): the price is the same, and each icon gets more room.
 */
export function sheetSizes(count: number): number[] {
  if (count <= 0) return [];
  const sheets = Math.ceil(count / SHEET_MAX);
  const base = Math.floor(count / sheets);
  return Array.from({ length: sheets }, (_, i) => base + (i < count % sheets ? 1 : 0));
}

/** Each sheet pays its fixed part: it costs Gemini as much as the first. */
export function imageCredits(count: number): number {
  return sheetSizes(count).length * CREDITS.sheet + Math.max(0, count) * CREDITS.image;
}

/** New cards, plus cards whose word is replaced: 1 credit each, 5 at most (one call). */
export function wordCredits(count: number, replaced = 0): number {
  return Math.min(count + replaced, WORDS_CAP) * CREDITS.word;
}

export function tierCredits(count: number): number {
  return count * CREDITS.tier;
}

/** Tone of the tier names: the server knows each one's instructions. */
export type TierTone = 'humour' | 'serieux' | 'fantaisiste' | 'enfantin' | 'vulgaire';

export type AiJob = {
  listId: string;
  kind: 'words' | 'images' | 'tiers';
  phase: 'working' | 'done' | 'error';
  /** Cards added (words), or cards to illustrate (images). */
  cards: number;
  /** Icons received so far. */
  icons: number;
  /** Icons that couldn't be drawn (the card keeps its emoji). */
  failed: number;
  /** Cards whose word was replaced (words). */
  replaced?: number;
  /** Tiers renamed. */
  tiers?: number;
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
  const short = creditsError(e);
  if (short) return short;
  const m = e instanceof Error ? e.message : '';
  if (m === 'quota') return 'Limite de générations atteinte pour aujourd’hui : réessayez demain.';
  if (m === 'theme refused') return 'Ce thème ne peut pas être généré : essayez-en un autre.';
  if (m === 'busy' || m === 'ai unavailable' || m === 'server') return 'L’IA est indisponible pour le moment : réessayez dans un instant.';
  return 'Pas de connexion : réessayez dans un instant.';
}

/** Cards whose word can be replaced: all but photos, which are the player's own. */
export function replaceableCards(list: TierList): Card[] {
  return Object.values(list.cards).filter((c) => !c.imageName);
}

/**
 * `count` new cards for the theme, and new words for the cards of `replaceIds`, in
 * place (same tier, same colour). One call: the AI sees every card, the replaced ones
 * included, so it doesn't give them back.
 */
export async function generateWords(listId: string, theme: string, count: number, replaceIds: string[] = []): Promise<void> {
  const store = useTierStore.getState();
  const list = store.lists[listId];
  if (!list) return;
  const replace = replaceableCards(list).filter((c) => replaceIds.includes(c.id));
  useAiJob.setState({ job: { listId, kind: 'words', phase: 'working', cards: 0, icons: 0, failed: 0, replaced: 0 } });
  try {
    const existing = Object.values(list.cards).map((c) => c.label);
    const { cards, balance } = await aiWords(store.deviceId, await walletForRequest(), theme, count + replace.length, existing);
    setBalance(balance);
    const label = (c: (typeof cards)[number]) => `${c.emoji} ${c.label}`.trim();
    let replaced = 0;
    replace.forEach((card, i) => {
      const c = cards[i];
      if (!c || !useTierStore.getState().lists[listId]?.cards[card.id]) return;
      // Its picture showed the old word: the images tab will draw the new one.
      store.updateCard(listId, card.id, { label: label(c), aiConcept: c.concept || undefined, iconUrl: undefined, iconSvg: undefined });
      replaced++;
    });
    const added = cards.slice(replace.length, replace.length + count);
    added.forEach((c) => store.addCard(listId, { label: label(c), color: ANTHRACITE, aiConcept: c.concept || undefined }));
    // The theme asked is the best title the list can have.
    store.renameList(listId, theme);
    patch({ cards: added.length, replaced, phase: 'done' });
  } catch (e) {
    patch({ phase: 'error', error: aiError(e) });
  }
}

/**
 * New names for the list's tiers, in `tone`, tied to the theme: the AI also sees a few
 * cards, which say what the theme is really about. By position, best tier first; a
 * name the AI left out keeps the old one.
 */
export async function generateTiers(listId: string, theme: string, tone: TierTone): Promise<void> {
  const store = useTierStore.getState();
  const list = store.lists[listId];
  if (!list) return;
  useAiJob.setState({ job: { listId, kind: 'tiers', phase: 'working', cards: 0, icons: 0, failed: 0, tiers: 0 } });
  try {
    const examples = Object.values(list.cards)
      .map((c) => splitEmoji(c.label).text || c.label)
      .filter(Boolean)
      .slice(0, 12);
    const { labels, balance } = await aiTiers(store.deviceId, await walletForRequest(), theme, list.tiers.map((t) => t.label), tone, examples);
    setBalance(balance);
    let tiers = 0;
    list.tiers.forEach((t, i) => {
      const label = labels[i]?.trim();
      if (label && useTierStore.getState().lists[listId]?.tiers.some((x) => x.id === t.id)) {
        store.updateTier(listId, t.id, { label });
        tiers++;
      }
    });
    patch({ tiers, phase: 'done' });
  } catch (e) {
    patch({ phase: 'error', error: aiError(e) });
  }
}

/** Cards still without a picture: no photo, no AI icon, no icon drawn in the app. */
export function cardsNeedingImage(list: TierList): Card[] {
  return Object.values(list.cards).filter((c) => !c.imageName && !c.iconUrl && !c.iconSvg && !cardIconFor(splitEmoji(c.label).text));
}

/**
 * What the images tab offers: the cards without a picture, to draw (selected to start
 * with), and the illustrated ones, to redraw if the player picks them. Photos are the
 * player's own: never offered.
 */
export function imageChoices(list: TierList): { toDraw: Card[]; toRedraw: Card[] } {
  const toDraw = cardsNeedingImage(list);
  const toRedraw = Object.values(list.cards).filter((c) => !c.imageName && !toDraw.includes(c));
  return { toDraw, toRedraw };
}

/** Fewest images a generation draws: below that, a sheet costs more than it brings. */
export const MIN_IMAGES = 3;

/** Draws the selected cards (at least `MIN_IMAGES`): bare ones, and illustrated ones again. */
export async function generateImages(listId: string, cardIds: string[]): Promise<void> {
  const store = useTierStore.getState();
  const list = store.lists[listId];
  if (!list) return;
  // All drawn together on one sheet, so they all share the same style.
  const { toDraw, toRedraw } = imageChoices(list);
  const redraw = new Set(toRedraw.map((c) => c.id));
  const queue = [...toDraw, ...toRedraw].filter((c) => cardIds.includes(c.id));
  // In the list's order, as the player sees them.
  const order = Object.keys(list.cards);
  queue.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  if (queue.length < MIN_IMAGES) return;
  useAiJob.setState({ job: { listId, kind: 'images', phase: 'working', cards: queue.length, icons: 0, failed: 0 } });
  let wallet: string;
  try {
    wallet = await walletForRequest();
  } catch {
    return patch({ failed: queue.length, phase: 'done' });
  }
  // More than one sheet: drawn at the same time, each paid on its own, so a sheet that
  // fails (short of credits, Gemini busy) doesn't lose the other one's images.
  const batches: Card[][] = [];
  let start = 0;
  for (const size of sheetSizes(queue.length)) batches.push(queue.slice(start, (start += size)));
  await Promise.all(
    batches.map(async (batch) => {
      try {
        // A card without a concept (added by hand, or renamed): the server draws its label.
        // A redrawn card is read again in the theme: its concept may be what was wrong (a
        // flamingo for the colour pink). The server adds the new image beside the old one.
        const asked = batch.map((c) =>
          redraw.has(c.id) ? { label: splitEmoji(c.label).text, concept: '', redraw: true } : { label: splitEmoji(c.label).text, concept: c.aiConcept ?? '' },
        );
        // The theme gives a homonym its sense: "Rose" is a colour in a list of colours.
        const { icons, balance } = await aiIcons(store.deviceId, wallet, asked, list.title);
        setBalance(balance);
        batch.forEach((card, i) => {
          const url = icons[i]?.url;
          const concept = icons[i]?.concept;
          if (!url) return patch({ failed: (useAiJob.getState().job?.failed ?? 0) + 1 });
          // The card may have been deleted meanwhile.
          if (useTierStore.getState().lists[listId]?.cards[card.id]) useTierStore.getState().updateCard(listId, card.id, concept ? { iconUrl: url, aiConcept: concept } : { iconUrl: url });
          cacheAiIcon(url);
          patch({ icons: (useAiJob.getState().job?.icons ?? 0) + 1 });
        });
      } catch (e) {
        // Short of credits: said as such (nothing was drawn, nothing taken for this sheet).
        const error = creditsError(e);
        patch({ failed: (useAiJob.getState().job?.failed ?? 0) + batch.length, ...(error ? { error } : {}) });
      }
    }),
  );
  patch({ phase: 'done' });
}
