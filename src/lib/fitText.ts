/**
 * Average width of a character, in em, of a semi-bold label: measured over the 430 card
 * names of the public lists (95th percentile of their words, Chromium's sans-serif, a little
 * wider than the iPhone's): sized on it, a name fits on every phone.
 */
export const CHAR_WIDTH = 0.62;

/** The words of `text` on lines of at most `capacity` characters; a longer word is split. */
export function wrapWords(text: string, capacity: number): string[] {
  const room = Math.max(1, Math.floor(capacity));
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= room) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
    while (line.length > room) {
      lines.push(line.slice(0, room));
      line = line.slice(room);
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The largest font size (by half points, from `max` down to `min`) that writes `text`
 * whole within `width` points on at most `maxLines` lines, words unbroken: names cut
 * with « … » read badly everywhere in the app. At `min`, a word too long is split, and
 * `fits` is false.
 */
export function fitText(text: string, width: number, { maxLines, max, min }: { maxLines: number; max: number; min: number }) {
  for (let fontSize = max; fontSize >= min; fontSize -= 0.5) {
    const capacity = width / (fontSize * CHAR_WIDTH);
    const words = text.split(/\s+/);
    if (words.some((w) => w.length > capacity)) continue;
    const lines = wrapWords(text, capacity);
    if (lines.length <= maxLines) return { fontSize, lines, fits: true };
  }
  return { fontSize: min, lines: wrapWords(text, width / (min * CHAR_WIDTH)), fits: false };
}
