import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '../constants/theme';
import { createAndOpen } from '../lib/create';
import { useT } from '../lib/i18n/useT';
import { CONTENT_MAX_WIDTH, useResponsive } from '../lib/layout';
import { useAllTemplates } from '../store/useCatalog';
import { Clickable } from '../components/Clickable';

export default function Templates() {
  const insets = useSafeAreaInsets();
  const templates = useAllTemplates();
  const { t } = useT();
  const { column, gutter, width, isTablet } = useResponsive();
  const columns = isTablet ? 3 : 2;
  const inner = Math.min(width, CONTENT_MAX_WIDTH) - gutter * 2;
  const cardWidth = Math.floor((inner - spacing.md * (columns - 1)) / columns);
  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}>
      <Text style={styles.intro}>{t('editor.templates.intro')}</Text>
      <View style={styles.grid}>
        {templates.map((template) => (
          <Clickable
            key={template.key}
            accessibilityRole="button"
            onPress={() => createAndOpen(template)}
            style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.emoji}>{template.emoji}</Text>
            <Text numberOfLines={2} style={styles.title}>
              {template.title}
            </Text>
            <Text style={styles.meta}>{t('editor.templates.cards', { count: template.items.length })}</Text>
            <Text numberOfLines={1} style={[styles.sample, template.appStoreIds && { fontSize: 13 }]}>
              {template.appStoreIds ? t('editor.templates.appIcons') : template.items.slice(0, 5).map((i) => i.split(' ')[0]).join(' ')}
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
