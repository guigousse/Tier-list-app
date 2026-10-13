import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip } from '../components/ui';
import { TIER_PRESETS } from '../constants/presets';
import { colors, radius, spacing, type CardSize } from '../constants/theme';
import { useResponsive } from '../lib/layout';
import { useTierStore } from '../store/useTierStore';

const SIZES: { key: CardSize; label: string }[] = [
  { key: 'small', label: 'Petite' },
  { key: 'medium', label: 'Moyenne' },
  { key: 'large', label: 'Grande' },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const settings = useTierStore((s) => s.settings);
  const count = useTierStore((s) => Object.keys(s.lists).length);
  const { updateSettings, clearAll } = useTierStore.getState();

  const confirmClear = () =>
    Alert.alert('Tout effacer ?', 'Toutes vos tier lists et leurs images seront supprimées. Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Tout effacer', style: 'destructive', onPress: clearAll },
    ]);

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>Éditeur</Text>
        <Row label="Retour haptique" hint="Vibration légère lors du glisser-déposer">
          <Switch
            value={settings.haptics}
            onValueChange={(haptics) => updateSettings({ haptics })}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <Row label="Afficher le nom des cartes">
          <Switch
            value={settings.showCardLabels}
            onValueChange={(showCardLabels) => updateSettings({ showCardLabels })}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <View style={styles.block}>
          <Text style={styles.rowLabel}>Taille des cartes</Text>
          <View style={styles.chips}>
            {SIZES.map((s) => (
              <Chip key={s.key} label={s.label} selected={settings.cardSize === s.key} onPress={() => updateSettings({ cardSize: s.key })} />
            ))}
          </View>
        </View>
        <View style={styles.block}>
          <Text style={styles.rowLabel}>Rangs par défaut</Text>
          <View style={styles.chips}>
            {TIER_PRESETS.map((p) => (
              <Chip
                key={p.key}
                label={`${p.name} (${p.labels.length})`}
                selected={settings.defaultPresetKey === p.key}
                onPress={() => updateSettings({ defaultPresetKey: p.key })}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Données</Text>
        <Text style={styles.rowHint}>
          {count} tier list{count > 1 ? 's' : ''} enregistrée{count > 1 ? 's' : ''} sur cet appareil. Vos données ne quittent jamais votre téléphone.
        </Text>
        <Button label="Tout effacer" icon="trash-outline" variant="danger" onPress={confirmClear} disabled={count === 0} />
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>À propos</Text>
        <Row label="Version">
          <Text style={styles.rowHint}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </Row>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, borderWidth: 1, borderColor: colors.border },
  groupTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  block: { gap: spacing.sm },
  rowLabel: { color: colors.text, fontSize: 16 },
  rowHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
