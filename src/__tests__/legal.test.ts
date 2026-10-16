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
