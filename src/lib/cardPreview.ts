import type { Card } from '../store/types';

export type PreviewForm = { label: string; color: string; imageName?: string; iconRemoved?: boolean };

/**
 * The card as the edit sheet shows it: what is being typed, over the image the card
 * already has. Without its AI image, the preview showed the emoji of a card that is
 * drawn everywhere else.
 */
export function cardPreview(card: Card | null, form: PreviewForm): Card {
  const preview: Card = { id: 'preview', label: form.label || '?', color: form.color };
  if (form.imageName) preview.imageName = form.imageName;
  if (card && !form.iconRemoved) {
    if (card.iconUrl) preview.iconUrl = card.iconUrl;
    if (card.iconSvg) preview.iconSvg = card.iconSvg;
  }
  return preview;
}
