import { useWindowDimensions } from 'react-native';

import { CARD_SIZES, spacing, type CardSize } from '../constants/theme';

/** Widest a column of text and forms gets on large screens (tablets). */
export const CONTENT_MAX_WIDTH = 720;
/** Widest a bottom sheet gets on large screens. */
export const SHEET_MAX_WIDTH = 560;

/** Screen-size dependent layout values, recomputed on rotation and window resize. */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = Math.min(width, height) >= 600;
  const isCompact = width < 360;
  const gutter = isTablet ? spacing.xl : isCompact ? spacing.md : spacing.lg;

  return {
    width,
    isTablet,
    isCompact,
    /** Horizontal padding of screens. */
    gutter,
    /** Style that centres a content column and caps its width on large screens. */
    column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' } as const,
    /** Card side in the editor: larger on tablets, slightly smaller on narrow phones. */
    cardSize: (size: CardSize) => Math.round(CARD_SIZES[size] * (isTablet ? 1.3 : isCompact ? 0.85 : 1)),
    /** Width of the tier label column in the editor. */
    tierLabelWidth: isTablet ? 120 : isCompact ? 64 : 84,
  };
}

/**
 * Width of a bold character, as a share of the font size, measured on a tier label: up to
 * 0.59 for the Latin letters, 0.66 for the Greek ones ("Μπλιαχ").
 */
const BOLD_CHAR = 0.6;
const BOLD_GREEK = 0.7;

/**
 * Font size of a tier label in a column `width` wide (padding taken off): the longest
 * word must fit on one line, or it is cut in the middle ("encha / ntée"), which the
 * text's own shrinking doesn't prevent. Never below 9: smaller, it stops being read;
 * 11 cut "Désinstallé" and "Insupportable" already.
 */
export function tierLabelFontSize(label: string, width: number): number {
  const widest = Math.max(1, ...label.split(/\s+/).map((w) => w.length * (/[\u0370-\u03ff]/.test(w) ? BOLD_GREEK : BOLD_CHAR)));
  return Math.max(9, Math.min(20, Math.floor(width / widest)));
}
