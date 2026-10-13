import { useCatalog } from '../store/useCatalog';
import { useTierStore } from '../store/useTierStore';
import { setTemplateFavorite } from './api';

/** Adds or removes a popular tier list from the favourites, here and online. */
export function toggleFavorite(key: string): void {
  const store = useTierStore.getState();
  const favorite = store.toggleTemplateFavorite(key);
  useCatalog.getState().bumpStat(key, 'favorites', favorite ? 1 : -1);
  setTemplateFavorite(key, store.deviceId, favorite).catch(() => {
    // Offline: undo, so what's shown matches what's counted.
    useTierStore.getState().toggleTemplateFavorite(key);
    useCatalog.getState().bumpStat(key, 'favorites', favorite ? -1 : 1);
  });
}

/** Compact count: 950, 1,2 k, 12 k, 1,3 M. */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const [value, unit] = n < 1e6 ? [n / 1e3, 'k'] : [n / 1e6, 'M'];
  const digits = value < 10 ? 1 : 0;
  return `${value.toFixed(digits).replace('.', ',').replace(/,0$/, '')} ${unit}`;
}
