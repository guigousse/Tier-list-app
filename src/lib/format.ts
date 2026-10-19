import { localeTag } from './i18n';
import { currentLanguage, t } from './i18n/useT';

// The language is read when the text is made, never at import: the player can change it at any time.
const appLocale = () => localeTag(currentLanguage());

export function relativeTime(timestamp: number, now = Date.now(), locale = appLocale()): string {
  const diff = Math.max(0, now - timestamp);
  const min = Math.floor(diff / 60000);
  if (min < 1) return t('app.time.now');
  if (min < 60) return t('app.time.minutes', { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('app.time.hours', { n: h });
  const d = Math.floor(h / 24);
  if (d === 1) return t('app.time.yesterday');
  if (d < 7) return t('app.time.days', { n: d });
  return new Date(timestamp).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}

/** "2026-10-13" → "mardi 13 octobre" (in the app's language unless `locale` says otherwise). */
export function formatDay(day: string, locale = appLocale()): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}
