import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field } from '../components/ui';
import { colors, radius, readableTextColor, spacing } from '../constants/theme';
import { fetchSharedList } from '../lib/api';
import { useT } from '../lib/i18n/useT';
import { useResponsive } from '../lib/layout';
import { decodeShared, normalizeCode, type SharedList } from '../lib/share';
import { useTierStore } from '../store/useTierStore';

type Lookup = { code: string; status: 'loading' | 'found' | 'missing' | 'offline'; shared?: SharedList };

/**
 * Adds a tier list received from someone else. Opened by a shared link
 * (…/s/CODE, or an offline …/import?d=… link), or from the app to type a code /
 * paste a link by hand. The list is shown first: it's only added once confirmed.
 */
export default function ImportScreen() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const { t } = useT();
  const { d, c } = useLocalSearchParams<{ d?: string; c?: string }>();
  const fromLink = Boolean(d || c);
  const [typed, setTyped] = useState('');
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [attempt, setAttempt] = useState(0);

  const input = d ? `?d=${d}` : c ? `/s/${c}` : typed;
  const offline = useMemo(() => decodeShared(input), [input]);
  const code = offline ? null : normalizeCode(input);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    fetchSharedList(code)
      .then((shared) => !cancelled && setLookup({ code, status: shared ? 'found' : 'missing', shared: shared ?? undefined }))
      .catch(() => !cancelled && setLookup({ code, status: 'offline' }));
    return () => {
      cancelled = true;
    };
  }, [code, attempt]);

  // Until the request for this code answers, it is loading.
  const current: Lookup | null = !code ? null : lookup?.code === code ? lookup : { code, status: 'loading' };
  const shared = offline ?? current?.shared ?? null;

  const add = () => {
    if (!shared) return;
    const id = useTierStore.getState().importList(shared);
    router.replace({ pathname: '/editor/[id]', params: { id } });
  };

  const ranked = shared ? shared.cards.filter((card) => card.tier >= 0).length : 0;
  // With cards, the list arrives as a challenge: ranked here without seeing the sharer's ranking.
  const challenge = Boolean(shared && shared.cards.length > 0);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[column, { padding: gutter, gap: spacing.xl }]}>
        {!fromLink ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.intro}>{t('editor.import.intro')}</Text>
            <Field
              value={typed}
              onChangeText={setTyped}
              placeholder={t('editor.import.placeholder')}
              autoCorrect={false}
              autoCapitalize="characters"
              autoFocus
              style={styles.input}
            />
          </View>
        ) : null}

        {shared ? (
          <View style={styles.preview}>
            <Text numberOfLines={2} style={styles.title}>
              {shared.title}
            </Text>
            <Text style={styles.meta}>
              {t('editor.row.tiers', { count: shared.tiers.length })} · {t('editor.import.cards', { count: shared.cards.length })} · {t('editor.import.ranked', { count: ranked })}
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
            <Text numberOfLines={4} style={styles.cards}>
              {shared.cards.map((card) => card.label || t('editor.card')).join(' · ')}
            </Text>
            {challenge ? (
              <Text style={styles.challenge}>
                {shared.from ? t('editor.import.challengeBy', { name: shared.from }) : t('editor.import.challengeAnon')}
              </Text>
            ) : null}
            <Text style={styles.hint}>{t('editor.import.photosHint')}</Text>
          </View>
        ) : current?.status === 'loading' ? (
          <ActivityIndicator color={colors.primary} />
        ) : current?.status === 'missing' ? (
          <Text style={styles.error}>{t('editor.import.notFound', { code: current.code })}</Text>
        ) : current?.status === 'offline' ? (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.error}>{t('editor.import.offline')}</Text>
            <Button
              label={t('editor.import.retry')}
              icon="refresh"
              variant="secondary"
              onPress={() => {
                setLookup(null);
                setAttempt((n) => n + 1);
              }}
            />
          </View>
        ) : input.trim() && !code ? (
          <Text style={styles.error}>{t('editor.import.invalid')}</Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: gutter, paddingBottom: insets.bottom + spacing.md }]}>
        <View style={column}>
          <Button
            label={challenge ? t('editor.import.accept') : t('editor.import.add')}
            icon={challenge ? 'flash-outline' : 'download-outline'}
            onPress={add}
            disabled={!shared}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  input: { fontSize: 22, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  preview: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 14 },
  tiers: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  tier: { minWidth: 36, maxWidth: 120, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  tierLabel: { fontSize: 13, fontWeight: '800' },
  cards: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  challenge: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '600', marginTop: spacing.xs },
  error: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  footer: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
});
