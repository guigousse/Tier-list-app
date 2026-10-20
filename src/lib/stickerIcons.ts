import { useTierStore } from '../store/useTierStore';
import { cacheAiIcon, hasStickerBorder } from './aiIconFiles';
import { fetchIconReplacements } from './api';

/**
 * The library was redrawn as stickers (white border of their own): cards already in the
 * player's lists keep the old pictures' URLs, and move to the new pictures here, kept on
 * the device for offline use. Nothing asked once every card has a sticker picture.
 */
export async function upgradeCardIcons(): Promise<void> {
  const old = new Set<string>();
  for (const list of Object.values(useTierStore.getState().lists)) {
    for (const card of Object.values(list.cards)) if (card.iconUrl && !hasStickerBorder(card.iconUrl)) old.add(card.iconUrl);
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
