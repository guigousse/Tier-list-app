import { router } from 'expo-router';

import { CLASSIC_TIERS, sourceOf, type Template } from '../constants/presets';
import { useCatalog } from '../store/useCatalog';
import { popularVoteKey, useTierStore } from '../store/useTierStore';
import { fetchAppIcons } from './appstore';
import { t } from './i18n/useT';
import { downloadCardImage } from './images';
import { recordTemplateView, type DailyList } from './api';
import { copiesByKey } from './publicSync';

/**
 * Creates a tier list (classic S → D tiers, or the template's) and opens it in the
 * editor in edit mode, where its title, tiers and cards can be customised right away.
 */
export function createAndOpen(template?: Template): void {
  const store = useTierStore.getState();
  const id = store.createList({
    // A default title is text the player can rename: written in the language of the moment.
    title: template?.title ?? t('editor.newList'),
    tierLabels: template?.tiers ?? CLASSIC_TIERS,
    cardLabels: template?.items,
    cardRanks: template?.ranks,
    emoji: template?.emoji,
  });
  router.push({ pathname: '/editor/[id]', params: { id, edit: '1' } });
  if (template?.appStoreIds) attachAppIcons(id, template).catch(() => {});
}

/**
 * Opens the daily tier list: its results once validated, otherwise the player's copy
 * to rank, created the first time. `replace`: in place of the screen shown (the welcome).
 */
export function openDaily(daily: DailyList, replace = false): void {
  const store = useTierStore.getState();
  const go = (href: Parameters<typeof router.push>[0]) => (replace ? router.replace(href) : router.push(href));
  const existing = Object.values(store.lists).find((l) => l.daily?.day === daily.day);
  if (existing?.daily?.validatedAt) {
    go({ pathname: '/results/[id]', params: { id: existing.id } });
    return;
  }
  const id = existing?.id ?? store.createDailyList(daily);
  go({ pathname: '/editor/[id]', params: { id } });
}

/** Opens the player's copy of a popular tier list, creating it the first time. */
export function openPopular(shown: Template): void {
  // Opened from a translated gallery: the copy, its vote and its app icons go by the French list.
  const template = sourceOf(shown);
  const store = useTierStore.getState();
  const voteKey = popularVoteKey(template);
  const lists = Object.values(store.lists);
  // A past daily tier list played on its day: open that copy.
  const existing =
    (template.day ? lists.find((l) => l.daily?.day === template.day) : undefined) ??
    copiesByKey(lists, () => voteKey).get(template.key);
  // Today's daily tier list (e.g. from a friend's profile): play it as the daily one.
  const { daily: today, icons } = useCatalog.getState();
  const id =
    existing?.id ?? (template.day && template.day === today?.day ? store.createDailyList(today) : store.createPopularList(template, icons));
  // Cards added to the list since the copy was made arrive to rank.
  if (existing?.popular) store.syncPopular(existing.id, template, icons);
  router.push({ pathname: '/editor/[id]', params: { id } });
  // Counts in the trends (latest view per device).
  recordTemplateView(template.key, store.deviceId).catch(() => {});
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
        useTierStore.getState().updateCard(listId, cardId, { imageName, imageCredit: t('editor.appStoreCredit') });
      } catch {
        // Keep the card with its name only.
      }
    }),
  );
}
