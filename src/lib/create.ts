import { router } from 'expo-router';

import { CLASSIC_TIERS, type Template } from '../constants/presets';
import { useTierStore } from '../store/useTierStore';

/**
 * Creates a tier list (classic S → D tiers, or the template's) and opens it in the
 * editor, where its title, tiers and cards can be customised right away.
 */
export function createAndOpen(template?: Template): void {
  const id = useTierStore.getState().createList({
    title: template?.title ?? 'Nouvelle tier list',
    tierLabels: template?.tiers ?? CLASSIC_TIERS,
    cardLabels: template?.items,
  });
  router.push({ pathname: '/editor/[id]', params: { id } });
}
