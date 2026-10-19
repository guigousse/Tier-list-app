/**
 * The longest title of a list, in characters: measured in the list of lists of a
 * 375-point phone, the title's line holds 253 points, about 8 a character at 16 points
 * bold: 32 fill it to the edge, over the options button. Wrapped on two or three lines,
 * long titles broke the rows; cut with « … », they hid the end of the name. Where the
 * room is narrower (the editor's header), the title shrinks a little to hold on its line.
 */
export const MAX_TITLE = 32;

/** `title` trimmed to `max` characters, emoji kept whole. */
export function clampTitle(title: string, max = MAX_TITLE): string {
  return Array.from(title.trim()).slice(0, max).join('').trim();
}
