import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, StyleSheet, Text, View } from 'react-native';

import { CARD_COLORS, colors, spacing } from '../../constants/theme';
import { cardPreview } from '../../lib/cardPreview';
import { deleteCardImage, downloadCardImage, pickCardImage } from '../../lib/images';
import { findImages, searchTerm, type WikiImage } from '../../lib/wikimedia';
import { POOL, type Card, type Tier, type Zone } from '../../store/types';
import { CardView } from '../CardView';
import { ColorPicker } from '../ColorPicker';
import { Button, Chip, Field, Sheet } from '../ui';

export type CardDraft = Omit<Card, 'id'>;

type Props = {
  visible: boolean;
  /** Card being edited, or null to create new ones. */
  card: Card | null;
  zone: Zone | null;
  tiers: Tier[];
  onClose: () => void;
  onCreate: (drafts: CardDraft[]) => void;
  onUpdate: (patch: CardDraft) => void;
  onMove: (zone: Zone) => void;
  onDelete: () => void;
};

export function CardSheet({ visible, card, zone, tiers, onClose, onCreate, onUpdate, onMove, onDelete }: Props) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [imageName, setImageName] = useState<string | undefined>();
  const [imageCredit, setImageCredit] = useState<string | undefined>();
  /** The player took the card's AI image off: the image wand can draw it again. */
  const [iconRemoved, setIconRemoved] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  /** Pictures picked during this session of the sheet, not saved yet. */
  const pending = useRef(new Set<string>());

  /** Wikimedia pictures proposed for the card name, browsed one at a time. */
  const [web, setWeb] = useState<{ images: WikiImage[]; index: number } | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [shown, setShown] = useState<{ visible: boolean; cardId?: string }>({ visible: false });

  // Reset the form each time the sheet opens, or opens on another card.
  if (shown.visible !== visible || shown.cardId !== card?.id) {
    setShown({ visible, cardId: card?.id });
    if (visible) {
      setLabel(card?.label ?? '');
      setColor(card?.color ?? CARD_COLORS[0]);
      setImageName(card?.imageName);
      setImageCredit(card?.imageCredit);
      setIconRemoved(false);
      setBulk(false);
      setBulkText('');
      setWeb(null);
    }
  }

  const discardPending = (keep?: string) => {
    pending.current.forEach((name) => name !== keep && deleteCardImage(name));
    pending.current.clear();
  };

  const close = () => {
    discardPending();
    onClose();
  };

  const pick = async (source: 'library' | 'camera') => {
    try {
      const name = await pickCardImage(source);
      if (!name) return;
      pending.current.add(name);
      setImageName(name);
      setImageCredit(undefined);
    } catch {
      Alert.alert('Image indisponible', "Impossible d'importer cette image.");
    }
  };

  const searchWeb = async () => {
    const term = searchTerm(label);
    if (!term) {
      Alert.alert('Nom manquant', 'Donnez d’abord un nom à la carte pour chercher une image.');
      return;
    }
    setSearching(true);
    try {
      const images = await findImages(term);
      if (images.length === 0) Alert.alert('Aucune image trouvée', `Wikimedia n’a pas d’image pertinente pour « ${term} ».`);
      else setWeb({ images, index: 0 });
    } catch {
      Alert.alert('Recherche impossible', 'Wikimedia est injoignable : vérifiez votre connexion.');
    } finally {
      setSearching(false);
    }
  };

  const applyWebImage = async () => {
    const image = web?.images[web.index];
    if (!image) return;
    setSaving(true);
    try {
      const name = await downloadCardImage(image.url);
      pending.current.add(name);
      setImageName(name);
      setImageCredit(`${image.credit || 'Auteur inconnu'} — Wikimedia Commons`);
      setWeb(null);
    } catch {
      Alert.alert('Image indisponible', "Impossible de télécharger cette image.");
    } finally {
      setSaving(false);
    }
  };

  const draft = (): CardDraft => ({
    label: label.trim(),
    color,
    imageName,
    imageCredit: imageName ? imageCredit : undefined,
    // Its concept goes too: kept, the library would hand back the very same picture.
    ...(iconRemoved ? { iconUrl: undefined, iconSvg: undefined, aiConcept: undefined } : {}),
  });

  const saveSingle = (keepOpen: boolean) => {
    const d = draft();
    if (!d.label && !d.imageName) return;
    discardPending(d.imageName);
    if (card) {
      onUpdate(d);
      onClose();
      return;
    }
    onCreate([d]);
    if (keepOpen) {
      setLabel('');
      setImageName(undefined);
      setImageCredit(undefined);
    } else {
      onClose();
    }
  };

  const saveBulk = () => {
    const labels = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (labels.length === 0) return;
    onCreate(labels.map((l, i) => ({ label: l, color: CARD_COLORS[i % 7] })));
    discardPending();
    onClose();
  };

  const confirmDelete = () => {
    discardPending();
    onClose();
    setTimeout(
      () =>
        Alert.alert('Supprimer cette carte ?', undefined, [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: onDelete },
        ]),
      350,
    );
  };

  const preview = cardPreview(card, { label, color, imageName, iconRemoved });
  const hasImage = !!(preview.imageName || preview.iconUrl || preview.iconSvg);
  // An illustrated card is shown large, the way it is seen when placed.
  const previewSize = card && hasImage ? 150 : 92;

  const footer = card ? (
    <Button label="Enregistrer" icon="checkmark" onPress={() => saveSingle(false)} />
  ) : bulk ? (
    <Button label="Ajouter les cartes" icon="checkmark" onPress={saveBulk} disabled={!bulkText.trim()} />
  ) : (
    <View style={styles.row}>
      <Button style={styles.flex} variant="secondary" label="+ Autre" onPress={() => saveSingle(true)} disabled={!label.trim() && !imageName} />
      <Button style={styles.flex} label="Ajouter" icon="checkmark" onPress={() => saveSingle(false)} disabled={!label.trim() && !imageName} />
    </View>
  );

  return (
    <Sheet visible={visible} onClose={close} title={card ? 'Modifier la carte' : 'Nouvelle carte'} footer={footer}>
      {!card ? (
        <View style={styles.row}>
          <Chip label="Une carte" selected={!bulk} onPress={() => setBulk(false)} />
          <Chip label="Plusieurs à la fois" selected={bulk} onPress={() => setBulk(true)} />
        </View>
      ) : null}

      {bulk ? (
        <Field
          label="Une carte par ligne"
          value={bulkText}
          onChangeText={setBulkText}
          multiline
          autoFocus
          placeholder={'🍕 Pizza\n🍔 Burger\n🍣 Sushi'}
          style={{ minHeight: 160, textAlignVertical: 'top' }}
        />
      ) : (
        <>
          <View style={[styles.previewRow, previewSize > 92 && styles.previewColumn]}>
            <CardView card={preview} size={previewSize} />
            <View style={previewSize > 92 ? styles.stretch : { flex: 1 }}>
              <Field
                label="Nom"
                value={label}
                onChangeText={setLabel}
                maxLength={80}
                placeholder="Ex. 🍕 Pizza"
                autoFocus={!card}
                returnKeyType="done"
                onSubmitEditing={() => saveSingle(!card)}
                submitBehavior="submit"
              />
            </View>
          </View>

          {card ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>Placer dans</Text>
              <View style={styles.wrap}>
                {tiers.map((t) => (
                  <Chip key={t.id} label={t.label} selected={zone === t.id} onPress={() => onMove(t.id)} />
                ))}
                <Chip label="Non classée" selected={zone === POOL} onPress={() => onMove(POOL)} />
              </View>
            </View>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>Image</Text>
            <View style={styles.row}>
              <Button style={styles.flex} variant="secondary" icon="images-outline" label="Photos" onPress={() => pick('library')} />
              {Platform.OS !== 'web' ? (
                <Button style={styles.flex} variant="secondary" icon="camera-outline" label="Caméra" onPress={() => pick('camera')} />
              ) : null}
              <Button
                style={styles.flex}
                variant="secondary"
                icon="globe-outline"
                label={searching ? 'Recherche…' : 'Wikimedia'}
                onPress={searchWeb}
                disabled={searching}
              />
            </View>
            {web ? (
              <View style={styles.proposal}>
                <Image source={{ uri: web.images[web.index].url }} style={styles.proposalImage} resizeMode="cover" />
                <View style={{ flex: 1, gap: spacing.sm }}>
                  <Text numberOfLines={2} style={styles.credit}>
                    {web.images[web.index].credit || 'Wikimedia Commons'}
                  </Text>
                  <Text style={styles.creditSource}>
                    Wikimedia Commons · {web.index + 1}/{web.images.length}
                  </Text>
                  <View style={styles.row}>
                    {saving ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Button style={styles.flex} icon="checkmark" label="Utiliser" onPress={applyWebImage} />
                    )}
                  </View>
                  <View style={styles.row}>
                    {web.images.length > 1 ? (
                      <Button
                        style={styles.flex}
                        variant="secondary"
                        label="Autre"
                        onPress={() => setWeb({ ...web, index: (web.index + 1) % web.images.length })}
                      />
                    ) : null}
                    <Button style={styles.flex} variant="ghost" label="Annuler" onPress={() => setWeb(null)} />
                  </View>
                </View>
              </View>
            ) : null}
            {hasImage ? (
              <Button
                variant="ghost"
                icon="close-circle-outline"
                label="Retirer l'image"
                onPress={() => {
                  // The photo first: under it, the AI image shows again.
                  if (imageName) {
                    setImageName(undefined);
                    setImageCredit(undefined);
                  } else setIconRemoved(true);
                }}
              />
            ) : null}
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>Couleur de fond</Text>
            <ColorPicker key={card?.id ?? 'new'} value={color} onChange={setColor} palette={CARD_COLORS} />
          </View>


          {card ? <Button variant="ghost" icon="trash-outline" label="Supprimer la carte" onPress={confirmDelete} /> : null}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flex: { flex: 1, paddingHorizontal: spacing.sm },
  proposal: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: spacing.md },
  proposalImage: { width: 110, height: 110, borderRadius: 10, backgroundColor: colors.border },
  credit: { color: colors.text, fontSize: 13, fontWeight: '600' },
  creditSource: { color: colors.textMuted, fontSize: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  previewColumn: { flexDirection: 'column', gap: spacing.md },
  stretch: { alignSelf: 'stretch' },
});
