import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TEMPLATES } from '../constants/presets';
import { colors, radius, spacing } from '../constants/theme';

export default function Templates() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
      <Text style={styles.intro}>Choisissez un thème : les cartes sont déjà créées, il ne reste plus qu’à les classer.</Text>
      <View style={styles.grid}>
        {TEMPLATES.map((t) => (
          <Pressable
            key={t.key}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/new', params: { template: t.key } })}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.emoji}>{t.emoji}</Text>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.meta}>{t.items.length} cartes</Text>
            <Text numberOfLines={1} style={styles.sample}>
              {t.items.slice(0, 5).map((i) => i.split(' ')[0]).join(' ')}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    width: '47.5%',
    flexGrow: 1,
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
  sample: { fontSize: 18, marginTop: 4 },
});
