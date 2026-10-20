import { CHAR_WIDTH } from '../lib/fitText';
import { CHOSEN_LABEL_WIDTH, forkSides, stickerFit } from '../lib/forkSticker';
import { LANGUAGES } from '../lib/i18n';
import { CATALOGS } from '../lib/i18n/strings';

const badgeLabels = LANGUAGES.flatMap((language) =>
  Object.entries(CATALOGS[language])
    .filter(([key]) => key.startsWith('play.badge.'))
    .map(([, text]) => text),
);

describe('the sticker of a VS', () => {
  it('once chosen, its name holds on one line, in every language', () => {
    expect(badgeLabels.length).toBeGreaterThan(40);
    for (const label of badgeLabels) {
      const { lines, fontSize, fits } = stickerFit(label, true);
      expect(fits).toBe(true);
      expect(lines).toEqual([label]);
      expect(label.length * fontSize * CHAR_WIDTH).toBeLessThanOrEqual(CHOSEN_LABEL_WIDTH);
    }
  });

  it('both sides show while choosing and while the loser pops, the chosen one alone after', () => {
    expect(forkSides(-1, null)).toEqual([0, 1]);
    expect(forkSides(0, 1)).toEqual([0, 1]);
    expect(forkSides(0, null)).toEqual([0]);
    expect(forkSides(1, null)).toEqual([1]);
  });
});
