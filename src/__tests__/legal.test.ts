import { LEGAL_NOTICE, PRIVACY, PUBLISHER } from '../constants/legal';

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
