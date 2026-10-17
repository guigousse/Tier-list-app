import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/theme';
import { LEGAL_NOTICE, PRIVACY, type LegalSection } from '../../constants/legal';
import { useResponsive } from '../../lib/layout';
import { own } from '../../lib/own';

const DOCS: Record<string, { title: string; updated: string; sections: LegalSection[] }> = {
  confidentialite: { title: 'Confidentialité', updated: '13 octobre 2026', sections: PRIVACY },
  mentions: { title: 'Mentions légales', updated: '13 octobre 2026', sections: LEGAL_NOTICE },
};

/** Privacy policy and legal notice, readable offline inside the app. */
export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const page = own(DOCS, doc) ?? DOCS.confidentialite;

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen options={{ title: page.title }} />
      <Text style={styles.updated}>Dernière mise à jour : {page.updated}</Text>
      {page.sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text style={styles.title}>{s.title}</Text>
          {s.paragraphs?.map((p) => (
            <Text key={p} style={styles.text}>
              {p}
            </Text>
          ))}
          {s.bullets?.map((b) => (
            <View key={b} style={styles.bullet}>
              <Text style={styles.text}>•</Text>
              <Text style={[styles.text, { flex: 1 }]}>{b}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  updated: { color: colors.textMuted, fontSize: 13 },
  section: { gap: spacing.sm },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  text: { color: colors.text, fontSize: 15, lineHeight: 22 },
  bullet: { flexDirection: 'row', gap: spacing.sm },
});
