/**
 * The longest title of a list, in characters: what holds on one line in the list of
 * lists and the editor's header of a 375-point phone. Wrapped on two or three lines,
 * long titles broke the rows; cut with « … », they hid the end of the name.
 */
export const MAX_TITLE = 28;

/** `title` trimmed to `max` characters, emoji kept whole. */
export function clampTitle(title: string, max = MAX_TITLE): string {
  return Array.from(title.trim()).slice(0, max).join('').trim();
}
