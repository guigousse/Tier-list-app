import { useCallback } from 'react';

import { useTierStore } from '../../store/useTierStore';
import { deviceLocale, pickLanguage, pickRegion, translate, type Language, type Params } from './index';
import { el } from './el';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';

const CATALOGS = { fr, en, es, el };

// Read once: a phone changing its language restarts the app.
const LOCALE = deviceLocale();

/** The language the app speaks now, from the settings and the phone. */
export function currentLanguage(): Language {
  return pickLanguage(useTierStore.getState().settings.language, LOCALE);
}

export function currentRegion(): string | null {
  return pickRegion(useTierStore.getState().settings.region, LOCALE);
}

/** The phone's own region, offered first when the player picks one. */
export function deviceRegion(): string | null {
  return pickRegion('auto', LOCALE);
}

/** A text outside a screen (an alert from a library): in the language of the moment. */
export function t(key: string, params?: Params): string {
  return translate(CATALOGS, currentLanguage(), key, params);
}

/** A screen's texts: they change at once when the language is changed in the settings. */
export function useT() {
  const chosen = useTierStore((s) => s.settings.language);
  const language = pickLanguage(chosen, LOCALE);
  const tr = useCallback((key: string, params?: Params) => translate(CATALOGS, language, key, params), [language]);
  return { t: tr, language };
}

export function useRegion(): string | null {
  const chosen = useTierStore((s) => s.settings.region);
  return pickRegion(chosen, LOCALE);
}
