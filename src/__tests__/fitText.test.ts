import { CHAR_WIDTH, fitText, wrapWords } from '../lib/fitText';

const widest = (lines: string[]) => Math.max(...lines.map((l) => l.length));

describe('a name written whole in a small space', () => {
  it('a short name keeps the largest size, on one line', () => {
    expect(fitText('Kiwi', 60, { maxLines: 2, max: 11, min: 7 })).toEqual({ fontSize: 11, lines: ['Kiwi'], fits: true });
  });

  it('a long name wraps on its words and shrinks just enough: nothing cut', () => {
    for (const name of ['Faire pousser les plantes', 'Éternuer des paillettes', 'Tout entendre sans arrêt', 'Framboise', 'Pastèque']) {
      const { fontSize, lines } = fitText(name, 64, { maxLines: 3, max: 11, min: 7 });
      expect(lines.join(' ')).toBe(name);
      expect(lines.length).toBeLessThanOrEqual(3);
      expect(widest(lines) * fontSize * CHAR_WIDTH).toBeLessThanOrEqual(64);
      expect(fontSize).toBeGreaterThanOrEqual(7);
    }
  });

  it('as big as possible: half a point more would not fit', () => {
    const { fontSize } = fitText('Les Aventuriers du Rail', 64, { maxLines: 2, max: 13, min: 7 });
    const lines = wrapWords('Les Aventuriers du Rail', 64 / ((fontSize + 0.5) * CHAR_WIDTH));
    expect(fontSize === 13 || lines.length > 2 || widest(lines) * (fontSize + 0.5) * CHAR_WIDTH > 64).toBe(true);
  });

  it('a single word too long for the smallest size still comes whole', () => {
    const { fontSize, lines } = fitText('Anticonstitutionnellement', 40, { maxLines: 2, max: 11, min: 7 });
    const fit = fitText('Anticonstitutionnellement', 40, { maxLines: 2, max: 11, min: 7 });
    expect(fontSize).toBe(7);
    expect(lines.join('')).toBe('Anticonstitutionnellement');
    // Said, so a card can show its picture alone rather than a name broken in two.
    expect(fit.fits).toBe(false);
  });
});

describe('a name over a small card', () => {
  it('keeps within the height given: smaller font rather than lines running off the card', () => {
    const { fontSize, lines } = fitText('Noix de coco râpée', 38, { maxLines: 4, max: 10, min: 6, height: 28 });
    expect(lines.length * Math.round(fontSize * 1.2)).toBeLessThanOrEqual(28);
    expect(lines.join(' ')).toBe('Noix de coco râpée');
  });
});
