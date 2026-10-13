import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../constants/theme';
import { createAndOpen } from '../lib/create';
import { CONTENT_MAX_WIDTH, useResponsive } from '../lib/layout';
import { useAllTemplates } from '../store/useCatalog';
import { Clickable } from '../components/Clickable';

export default function Templates() {
  const insets = useSafeAreaInsets();
  const templates = useAllTemplates();
  const { column, gutter, width, isTablet } = useResponsive();
  const columns = isTablet ? 3 : 2;
  const inner = Math.min(width, CONTENT_MAX_WIDTH) - gutter * 2;
  const cardWidth = Math.floor((inner - spacing.md * (columns - 1)) / columns);
  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={styles.intro}>Choisissez un thème : les cartes sont déjà créées, il ne reste plus qu’à les classer.</Text>
      <View style={styles.grid}>
        {templates.map((t) => (
          <Clickable
            key={t.key}
            accessibilityRole="button"
            onPress={() => createAndOpen(t)}
            style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.emoji}>{t.emoji}</Text>
            <Text numberOfLines={2} style={styles.title}>
              {t.title}
            </Text>
            <Text style={styles.meta}>{t.items.length} cartes</Text>
            <Text numberOfLines={1} style={[styles.sample, t.appStoreIds && { fontSize: 13 }]}>
              {t.appStoreIds ? 'Avec les icônes des apps' : t.items.slice(0, 5).map((i) => i.split(' ')[0]).join(' ')}
            </Text>
          </Clickable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 36 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13 },
  sample: { fontSize: 18, marginTop: 4, color: colors.textMuted },
});
