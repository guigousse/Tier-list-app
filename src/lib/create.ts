import { router } from 'expo-router';

import { CLASSIC_TIERS, type Template } from '../constants/presets';
import { popularVoteKey, useTierStore } from '../store/useTierStore';
import { fetchAppIcons } from './appstore';
import { downloadCardImage } from './images';
import { countView } from './popular';

/**
 * Creates a tier list (classic S → D tiers, or the template's) and opens it in the
 * editor, where its title, tiers and cards can be customised right away.
 */
export function createAndOpen(template?: Template): void {
  const store = useTierStore.getState();
  const id = store.createList({
    title: template?.title ?? 'Nouvelle tier list',
    tierLabels: template?.tiers ?? CLASSIC_TIERS,
    cardLabels: template?.items,
    cardRanks: template?.ranks,
    emoji: template?.emoji,
  });
  router.push({ pathname: '/editor/[id]', params: { id } });
  if (template?.appStoreIds) attachAppIcons(id, template).catch(() => {});
}

/** Opens the player's copy of a popular tier list, creating it the first time. */
export function openPopular(template: Template): void {
  const store = useTierStore.getState();
  const voteKey = popularVoteKey(template);
  const existing = Object.values(store.lists).find((l) => l.popular?.voteKey === voteKey);
  const id = existing?.id ?? store.createPopularList(template);
  router.push({ pathname: '/editor/[id]', params: { id } });
  countView(template.key);
  if (!existing && template.appStoreIds) attachAppIcons(id, template).catch(() => {});
}

/** Gives the template's cards their app icon, in the background (cards keep their name if offline). */
async function attachAppIcons(listId: string, template: Template): Promise<void> {
  const icons = await fetchAppIcons(template.items.map((name, i) => ({ id: template.appStoreIds?.[i], name: name.split(' : ')[0] })));
  const list = useTierStore.getState().lists[listId];
  if (!list) return;
  const cardByLabel = new Map(Object.values(list.cards).map((c) => [c.label, c.id]));
  await Promise.all(
    template.items.map(async (label, i) => {
      const url = icons[i];
      const cardId = cardByLabel.get(label);
      if (!url || !cardId) return;
      try {
        const imageName = await downloadCardImage(url);
        useTierStore.getState().updateCard(listId, cardId, { imageName, imageCredit: 'Icône : App Store' });
      } catch {
        // Keep the card with its name only.
      }
    }),
  );
}
