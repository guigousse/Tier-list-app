import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/theme';
import { legalNoticeIn, privacyIn, type LegalSection } from '../../constants/legal';
import type { Language } from '../../lib/i18n';
import { useT } from '../../lib/i18n/useT';
import { useResponsive } from '../../lib/layout';
import { own } from '../../lib/own';

// Title as a text key, date as a day, sections by language: all in the player's language at render.
const DOCS: Record<string, { title: string; updated: string; sections: (lang: Language) => LegalSection[] }> = {
  confidentialite: { title: 'app.legal.privacy', updated: '2026-10-20', sections: privacyIn },
  mentions: { title: 'app.settings.legal', updated: '2026-10-19', sections: legalNoticeIn },
};

/** Privacy policy and legal notice, readable offline inside the app. */
export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const { t, locale, language } = useT();
  const page = own(DOCS, doc) ?? DOCS.confidentialite;

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Stack.Screen options={{ title: t(page.title) }} />
      <Text style={styles.updated}>
        {t('app.legal.updated', { date: new Date(`${page.updated}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) })}
      </Text>
      {page.sections(language).map((s) => (
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
