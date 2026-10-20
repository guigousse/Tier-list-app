import { fitText } from './fitText';

/** Width of a VS's column (two stickers side by side) and of one sticker. */
export const FORK_COL = 150;
export const STICKER_BOX = 72;
/**
 * Once chosen, the sticker stands alone, centred on its VS: its pill has the whole
 * column, less its padding, to write « Team Chien » on one line (no tick: the green
 * of the pill says it is the player's).
 */
export const CHOSEN_LABEL_WIDTH = FORK_COL - 14;

/** A badge's name on its pill: on one line if it can, else on two (« Team / Montagne »). */
export function stickerFit(label: string, chosen: boolean) {
  if (chosen)
    return fitText(label, CHOSEN_LABEL_WIDTH, {
      maxLines: 1,
      max: 11,
      min: 8.5,
    });
  const width = STICKER_BOX - 14;
  const one = fitText(label, width, { maxLines: 1, max: 10, min: 8.5 });
  return one.fits ? one : fitText(label, width, { maxLines: 2, max: 10, min: 8 });
}

/** Sides drawn at a VS: both until the one given up has popped, then the chosen one alone. */
export function forkSides(choice: number, popping: 0 | 1 | null): (0 | 1)[] {
  return choice === -1 || popping !== null ? [0, 1] : [choice as 0 | 1];
}
