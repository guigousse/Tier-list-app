import { useTierStore } from '../store/useTierStore';
import { cacheAiIcon } from './aiIconFiles';
import { fetchIconReplacements } from './api';

/** Pictures of the image library (and of the AI cards), the ones that can be redrawn. */
const LIBRARY = '/card-icons/';

/**
 * Library pictures get redrawn (as stickers with their white border, or again when one
 * came out wrong): cards already in the player's lists keep the URL they got, and move
 * to the new picture here, kept on the device for offline use.
 */
export async function upgradeCardIcons(): Promise<void> {
  const old = new Set<string>();
  for (const list of Object.values(useTierStore.getState().lists)) {
    for (const card of Object.values(list.cards)) if (card.iconUrl?.includes(LIBRARY)) old.add(card.iconUrl);
  }
  if (!old.size) return;
  try {
    const replacements = await fetchIconReplacements([...old]);
    if (!Object.keys(replacements).length) return;
    useTierStore.getState().replaceIcons(replacements);
    Object.values(replacements).forEach((url) => cacheAiIcon(url));
  } catch {
    // Offline: the next opening tries again.
  }
}
