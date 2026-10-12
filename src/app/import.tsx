import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field } from '../components/ui';
import { colors, radius, readableTextColor, spacing } from '../constants/theme';
import { plural } from '../lib/format';
import { useResponsive } from '../lib/layout';
import { decodeShared } from '../lib/share';
import { useTierStore } from '../store/useTierStore';

/** Opened by a tiercraft://import?d=… link, or from the app to paste a shared message. */
export default function ImportScreen() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const { d } = useLocalSearchParams<{ d?: string }>();
  const [pasted, setPasted] = useState('');

  const shared = useMemo(() => decodeShared(d ? `?d=${d}` : pasted), [d, pasted]);

  const add = () => {
    if (!shared) return;
    const id = useTierStore.getState().importList(shared);
    router.replace({ pathname: '/editor/[id]', params: { id } });
  };

  const ranked = shared ? shared.cards.filter((c) => c.tier >= 0).length : 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[column, { padding: gutter, gap: spacing.xl }]}>
        {!d ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.intro}>Collez le message ou le lien reçu pour ajouter la tier list à votre téléphone.</Text>
            <Field
              value={pasted}
              onChangeText={setPasted}
              placeholder="tiercraft://import?d=…"
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
              style={{ minHeight: 120, textAlignVertical: 'top' }}
            />
          </View>
        ) : null}

        {shared ? (
          <View style={styles.preview}>
            <Text numberOfLines={2} style={styles.title}>
              {shared.title}
            </Text>
            <Text style={styles.meta}>
              {plural(shared.tiers.length, 'rang')} · {plural(shared.cards.length, 'carte')} · {ranked} classée{ranked > 1 ? 's' : ''}
            </Text>
            <View style={styles.tiers}>
              {shared.tiers.map((t, i) => (
                <View key={i} style={[styles.tier, { backgroundColor: t.color }]}>
                  <Text numberOfLines={1} style={[styles.tierLabel, { color: readableTextColor(t.color) }]}>
                    {t.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.hint}>Les photos des cartes ne sont pas transmises, seuls leurs noms et couleurs le sont.</Text>
          </View>
        ) : d || pasted.trim() ? (
          <Text style={styles.error}>Ce lien ne contient pas de tier list valide.</Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: gutter, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={column}>
          <Button label="Ajouter à mes tier lists" icon="download-outline" onPress={add} disabled={!shared} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  preview: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 14 },
  tiers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  tier: { minWidth: 36, maxWidth: 120, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  tierLabel: { fontSize: 13, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  error: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  footer: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
});
