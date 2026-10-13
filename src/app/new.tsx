import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, IconButton } from '../components/ui';
import { CLASSIC_TIERS, tierColorAt } from '../constants/presets';
import { colors, readableTextColor, spacing } from '../constants/theme';
import { useResponsive } from '../lib/layout';
import { useAllTemplates } from '../store/useCatalog';
import { useTierStore } from '../store/useTierStore';

const MAX_TIERS = 12;

/** Continues a letter sequence (… E, F → G), otherwise numbers the tier. */
function nextLabel(labels: string[]): string {
  const last = labels[labels.length - 1] ?? '';
  if (/^[A-Ya-y]$/.test(last)) return String.fromCharCode(last.charCodeAt(0) + 1);
  return `Rang ${labels.length + 1}`;
}

export default function NewList() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const { template: templateKey } = useLocalSearchParams<{ template?: string }>();
  const template = useAllTemplates().find((t) => t.key === templateKey);
  const createList = useTierStore((s) => s.createList);

  const [title, setTitle] = useState(template ? template.title : '');
  // Always starts from the classic S → D tiers (or the template's own), renamable below.
  const [labels, setLabels] = useState<string[]>(() => template?.tiers ?? CLASSIC_TIERS);

  const editLabel = (index: number, value: string) => {
    setLabels((prev) => prev.map((l, i) => (i === index ? value : l)));
  };

  const removeLabel = (index: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== index));
  };

  const addLabel = () => {
    setLabels((prev) => [...prev, nextLabel(prev)]);
  };

  const create = () => {
    const id = createList({
      title: title || template?.title || 'Ma tier list',
      tierLabels: labels.map((l, i) => l.trim() || `Rang ${i + 1}`),
      cardLabels: template?.items,
    });
    router.replace({ pathname: '/editor/[id]', params: { id } });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: spacing.xl }]}
      >
        {template ? (
          <View style={styles.templateBanner}>
            <Text style={{ fontSize: 28 }}>{template.emoji}</Text>
            <Text style={styles.templateText}>
              Modèle « {template.title} » · {template.items.length} cartes prêtes à classer
            </Text>
          </View>
        ) : null}

        <Field label="Titre" value={title} onChangeText={setTitle} placeholder="Ex. Meilleurs films de 2026" returnKeyType="done" />

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.label}>Rangs</Text>
          {labels.map((label, i) => (
            <View key={i} style={styles.tierRow}>
              <View style={[styles.tierBadge, { backgroundColor: tierColorAt(i) }]}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.35}
                  style={[styles.tierBadgeText, { color: readableTextColor(tierColorAt(i)) }]}
                >
                  {label || '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Field value={label} onChangeText={(v) => editLabel(i, v)} maxLength={20} placeholder={`Rang ${i + 1}`} />
              </View>
              <IconButton
                icon="remove-circle-outline"
                label={`Supprimer le rang ${label}`}
                color={labels.length <= 1 ? colors.border : colors.danger}
                onPress={() => labels.length > 1 && removeLabel(i)}
              />
            </View>
          ))}
          {labels.length < MAX_TIERS ? <Button label="Ajouter un rang" icon="add" variant="secondary" onPress={addLabel} /> : null}
          <Text style={styles.hint}>Les couleurs et les noms restent modifiables à tout moment dans l’éditeur.</Text>
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingHorizontal: gutter, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={column}>
          <Button label="Créer la tier list" icon="checkmark" onPress={create} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tierBadge: { width: 52, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  tierBadgeText: { fontWeight: '800', fontSize: 16, alignSelf: 'stretch', textAlign: 'center' },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  footer: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  templateBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, padding: spacing.md, borderRadius: 14 },
  templateText: { color: colors.text, flex: 1, fontSize: 15 },
});
