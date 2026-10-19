import { useTierStore } from '../store/useTierStore';
import { setLanguageApi } from './api';
import { currentLanguage } from './i18n/useT';

// What the server last took, so a launch or a re-render doesn't send it again.
let sent: string | null = null;

/**
 * Tells the server the app's language, which the notifications a friend triggers are
 * written in. Sent once per profile and language; again after a failure.
 */
export async function syncProfileLanguage(): Promise<void> {
  const { profile } = useTierStore.getState();
  if (!profile) return;
  const language = currentLanguage();
  const key = `${profile.secret}:${language}`;
  if (sent === key) return;
  sent = key;
  try {
    await setLanguageApi(profile.secret, language);
  } catch {
    sent = null;
  }
}
