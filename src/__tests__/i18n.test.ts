import { localeParts, pickLanguage, pickRegion, translate } from '../lib/i18n';

describe('the language the app opens in', () => {
  it('the phone’s, when the app speaks it', () => {
    expect(pickLanguage('auto', 'fr-FR')).toBe('fr');
    expect(pickLanguage('auto', 'fr-BE')).toBe('fr');
    expect(pickLanguage('auto', 'es-MX')).toBe('es');
    expect(pickLanguage('auto', 'el-GR')).toBe('el');
    expect(pickLanguage('auto', 'en-GB')).toBe('en');
  });

  it('English otherwise', () => {
    expect(pickLanguage('auto', 'de-DE')).toBe('en');
    expect(pickLanguage('auto', 'ja')).toBe('en');
    expect(pickLanguage('auto', '')).toBe('en');
  });

  it('the one chosen in the settings, whatever the phone', () => {
    expect(pickLanguage('el', 'fr-FR')).toBe('el');
  });
});

describe('the region of the player', () => {
  it('read from the phone’s settings, apart from the language', () => {
    expect(localeParts('fr-BE')).toEqual({ language: 'fr', region: 'BE' });
    expect(localeParts('el-CY')).toEqual({ language: 'el', region: 'CY' });
    expect(localeParts('zh-Hant-TW')).toEqual({ language: 'zh', region: 'TW' });
    expect(localeParts('en')).toEqual({ language: 'en', region: null });
  });

  it('the one chosen wins; none known: worldwide', () => {
    expect(pickRegion('auto', 'fr-FR')).toBe('FR');
    expect(pickRegion('GR', 'fr-FR')).toBe('GR');
    expect(pickRegion('auto', 'en')).toBe(null);
    expect(pickRegion('world', 'fr-FR')).toBe(null);
  });
});

describe('a text in the player’s language', () => {
  const catalogs = {
    fr: { hello: 'Bonjour {name}', lists_one: '{count} liste', lists_other: '{count} listes', onlyFr: 'Seulement' },
    en: { hello: 'Hello {name}', lists_one: '{count} list', lists_other: '{count} lists' },
  };

  it('fills the names in', () => {
    expect(translate(catalogs, 'en', 'hello', { name: 'Ana' })).toBe('Hello Ana');
  });

  it('agrees with the count, each language its own way (French: 0 and 1 are singular)', () => {
    expect(translate(catalogs, 'en', 'lists', { count: 0 })).toBe('0 lists');
    expect(translate(catalogs, 'fr', 'lists', { count: 0 })).toBe('0 liste');
    expect(translate(catalogs, 'fr', 'lists', { count: 2 })).toBe('2 listes');
  });

  it('a text missing in a language falls back to English, then French', () => {
    expect(translate(catalogs, 'el', 'hello', { name: 'Ana' })).toBe('Hello Ana');
    expect(translate(catalogs, 'en', 'onlyFr')).toBe('Seulement');
  });
});
