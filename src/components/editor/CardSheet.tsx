import { useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { CARD_COLORS, colors, spacing } from '../../constants/theme';
import { deleteCardImage, pickCardImage } from '../../lib/images';
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
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  /** Pictures picked during this session of the sheet, not saved yet. */
  const pending = useRef(new Set<string>());

  const [shown, setShown] = useState<{ visible: boolean; cardId?: string }>({ visible: false });

  // Reset the form each time the sheet opens, or opens on another card.
  if (shown.visible !== visible || shown.cardId !== card?.id) {
    setShown({ visible, cardId: card?.id });
    if (visible) {
      setLabel(card?.label ?? '');
      setColor(card?.color ?? CARD_COLORS[0]);
      setImageName(card?.imageName);
      setBulk(false);
      setBulkText('');
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
    } catch {
      Alert.alert('Image indisponible', "Impossible d'importer cette image.");
    }
  };

  const draft = (): CardDraft => ({ label: label.trim(), color, imageName });

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

  const preview: Card = { id: 'preview', label: label || '?', color, imageName };

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
          <View style={styles.previewRow}>
            <CardView card={preview} size={92} />
            <View style={{ flex: 1 }}>
              <Field
                label="Nom"
                value={label}
                onChangeText={setLabel}
                maxLength={40}
                placeholder="Ex. 🍕 Pizza"
                autoFocus={!card}
                returnKeyType="done"
                onSubmitEditing={() => saveSingle(!card)}
                submitBehavior="submit"
              />
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>Image</Text>
            <View style={styles.row}>
              <Button style={styles.flex} variant="secondary" icon="images-outline" label="Photos" onPress={() => pick('library')} />
              {Platform.OS !== 'web' ? (
                <Button style={styles.flex} variant="secondary" icon="camera-outline" label="Caméra" onPress={() => pick('camera')} />
              ) : null}
            </View>
            {imageName ? <Button variant="ghost" icon="close-circle-outline" label="Retirer l'image" onPress={() => setImageName(undefined)} /> : null}
          </View>

          <View style={{ gap: spacing.sm }}>
            <Text style={styles.label}>Couleur de fond</Text>
            <ColorPicker key={card?.id ?? 'new'} value={color} onChange={setColor} palette={CARD_COLORS} />
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
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});
