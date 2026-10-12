import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../../constants/theme';
import type { Tier } from '../../store/types';
import { ColorPicker } from '../ColorPicker';
import { Button, Field, Sheet } from '../ui';

type Props = {
  tier: Tier | null;
  index: number;
  count: number;
  cardCount: number;
  onClose: () => void;
  onSave: (patch: { label: string; color: string }) => void;
  onMove: (direction: -1 | 1) => void;
  onInsert: (where: 'above' | 'below') => void;
  onDelete: () => void;
};

export function TierSheet({ tier, index, count, cardCount, onClose, onSave, onMove, onInsert, onDelete }: Props) {
  const [label, setLabel] = useState(tier?.label ?? '');
  const [color, setColor] = useState(tier?.color ?? '#FF7F7F');
  const [shownTier, setShownTier] = useState(tier);

  // Reset the form whenever another tier is opened.
  if (tier !== shownTier) {
    setShownTier(tier);
    if (tier) {
      setLabel(tier.label);
      setColor(tier.color);
    }
  }

  const save = () => {
    onSave({ label: label.trim() || tier?.label || '?', color });
    onClose();
  };

  const confirmDelete = () => {
    onClose();
    setTimeout(
      () =>
        Alert.alert(
          'Supprimer ce rang ?',
          cardCount > 0 ? `Ses ${cardCount} carte(s) retourneront dans la barre du bas.` : undefined,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: onDelete },
          ],
        ),
      350,
    );
  };

  return (
    <Sheet visible={tier !== null} onClose={save} title="Modifier le rang" footer={<Button label="Terminé" onPress={save} />}>
      <Field label="Nom du rang" value={label} onChangeText={setLabel} maxLength={30} placeholder="S" />
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.label}>Couleur</Text>
        <ColorPicker key={shownTier?.id} value={color} onChange={setColor} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.label}>Position</Text>
        <View style={styles.row}>
          <Button style={styles.flex} variant="secondary" icon="arrow-up" label="Monter" disabled={index <= 0} onPress={() => onMove(-1)} />
          <Button style={styles.flex} variant="secondary" icon="arrow-down" label="Descendre" disabled={index >= count - 1} onPress={() => onMove(1)} />
        </View>
        <View style={styles.row}>
          <Button style={styles.flex} variant="secondary" icon="add" label="Rang au-dessus" onPress={() => { save(); onInsert('above'); }} />
          <Button style={styles.flex} variant="secondary" icon="add" label="Rang en dessous" onPress={() => { save(); onInsert('below'); }} />
        </View>
      </View>
      <Button variant="ghost" icon="trash-outline" label="Supprimer ce rang" disabled={count <= 1} onPress={confirmDelete} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, paddingHorizontal: spacing.sm },
});
