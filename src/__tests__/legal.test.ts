import { LEGAL_NOTICE, legalNoticeIn, PRIVACY, privacyIn, PUBLISHER } from '../constants/legal';
import { LANGUAGES } from '../lib/i18n';

const text = (sections: typeof PRIVACY) => sections.flatMap((s) => [s.title, ...(s.paragraphs ?? []), ...(s.bullets ?? [])]).join('\n');

describe('legal texts', () => {
  it('name the publisher and a real contact, no placeholder left', () => {
    expect(PUBLISHER.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/);
    for (const t of [text(PRIVACY), text(LEGAL_NOTICE)]) {
      expect(t).not.toMatch(/À compléter|\$\{/);
      expect(t).toContain(PUBLISHER.email);
    }
  });

  it('tell what the AI and the energy purchases send online', () => {
    const t = text(PRIVACY);
    expect(t).toContain('Anthropic');
    expect(t).toContain('Google Gemini');
    expect(t).toContain('transaction signée par Apple');
  });
});

describe('legal texts follow the latest features', () => {
  it('cover popular list views, badges and the energy kept after deleting the profile', () => {
    const t = text(PRIVACY);
    expect(t).toContain('ouvrez une liste publique');
    expect(t).toContain('badges');
    expect(t).toContain('porte-monnaie d’énergie n’est pas effacé');
  });

  it('give the terms of AI content and energy in the legal notice', () => {
    const titles = LEGAL_NOTICE.map((s) => s.title);
    expect(titles).toContain('Contenus générés par l’IA');
    expect(titles).toContain('Énergie et achats');
  });
});

describe('usage statistics', () => {
  it('say what Firebase measures, only with consent, and how to change it', () => {
    const t = text(PRIVACY);
    expect(t).toContain('Google Analytics pour Firebase');
    expect(t).toContain('seulement si vous l’acceptez');
    expect(t).toContain('Réglages → Statistiques d’usage');
  });
});

describe('legal texts in every language', () => {
  it('follow the French point for point', () => {
    const shape = (sections: typeof PRIVACY) => sections.map((s) => [s.paragraphs?.length ?? 0, s.bullets?.length ?? 0]);
    for (const lang of LANGUAGES) {
      expect(shape(privacyIn(lang))).toEqual(shape(PRIVACY));
      expect(shape(legalNoticeIn(lang))).toEqual(shape(LEGAL_NOTICE));
    }
  });

  it('are really translated, contact details filled in', () => {
    for (const lang of LANGUAGES.filter((l) => l !== 'fr')) {
      expect(privacyIn(lang)[0].title).not.toBe(PRIVACY[0].title);
    }
    for (const lang of LANGUAGES) {
      for (const t of [text(privacyIn(lang)), text(legalNoticeIn(lang))]) {
        expect(t).not.toMatch(/\$\{/);
        expect(t).toContain(PUBLISHER.email);
      }
      expect(text(privacyIn(lang))).toContain('cnil.fr');
    }
  });

  it('say what the language and the country are used for', () => {
    const t = text(PRIVACY);
    expect(t).toContain('la langue de l’app');
    expect(t).toContain('pays déduit de votre adresse IP');
  });
});
