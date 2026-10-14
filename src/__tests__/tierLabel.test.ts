import { tierLabelFontSize } from '../lib/layout';

describe('tier label size', () => {
  it('keeps the usual size for a short name', () => {
    expect(tierLabelFontSize('S', 72)).toBe(20);
    expect(tierLabelFontSize('Nectar divin', 72)).toBe(20);
  });

  it('shrinks so that the longest word is never cut in the middle', () => {
    // Measured on the screen at 20 px in 72 px: "Nectar" (6) fits, "errante" (7) broke.
    const size = tierLabelFontSize('Meule enchantée', 72);
    expect(size).toBeLessThan(20);
    expect('enchantée'.length * size * 0.6).toBeLessThanOrEqual(72);
  });

  it('never goes below a readable size', () => {
    expect(tierLabelFontSize('Anticonstitutionnellement', 52)).toBe(11);
  });
});
