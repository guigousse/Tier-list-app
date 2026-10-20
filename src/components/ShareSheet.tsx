import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { createChallengeCode } from '../lib/api';
import { useT } from '../lib/i18n/useT';
import { codeLink, copyText, offlineLink, shareUrl } from '../lib/share';
import { socialError } from '../lib/social';
import type { TierList } from '../store/types';
import { useTierStore } from '../store/useTierStore';
import { SendToFriends } from './SendToFriends';
import { Button, Sheet } from './ui';

/** Codes already created this session, per list version, so reopening the sheet doesn't create new ones. */
const codes = new Map<string, string>();

type Props = {
  list: TierList | null;
  visible: boolean;
  onClose: () => void;
  onShareImage?: () => void;
  /** What the picture is for (« Image pour les réseaux sociaux »). */
  imageLabel?: string;
};

/**
 * Shares a tier list as a challenge, with a short code (stored online) or an offline link as
 * a fallback: whoever opens it ranks the same cards, then compares with the player's ranking.
 */
export function ShareSheet({ list, visible, onClose, onShareImage, imageLabel }: Props) {
  const { t, upper } = useT();
  const key = list ? `${list.id}:${list.updatedAt}` : '';
  const [state, setState] = useState<{ key: string; code?: string; error?: string }>({ key: '' });
  const [attempt, setAttempt] = useState(0);
  // Sending to friends happens in the same sheet.
  const [toFriends, setToFriends] = useState(false);
  // Shown to whoever opens the link; the pseudo was moderated when the profile was made.
  const pseudo = useTierStore((s) => s.profile?.pseudo);

  useEffect(() => {
    if (!visible || !list || codes.has(key)) return;
    let cancelled = false;
    // The wallet ties the code to this player, credited when a new player ranks it.
    createChallengeCode(list, useTierStore.getState().walletSecret, pseudo)
      .then((code) => {
        codes.set(key, code);
        if (!cancelled) setState({ key, code });
      })
      .catch((e) => !cancelled && setState({ key, error: e instanceof Error && e.message.includes('content refused') ? socialError(e) : 'offline' }));
    return () => {
      cancelled = true;
    };
  }, [visible, key, list, attempt, pseudo]);

  if (!list) return null;
  const code = codes.get(key) ?? (state.key === key ? state.code : undefined);
  const error = state.key === key && state.error;
  const intro = (c: string) => t('social.challengeIntro', { title: list.title, code: c });

  const later = (fn: () => void) => () => {
    onClose();
    // iOS cannot present the share sheet while this modal animates out.
    setTimeout(fn, 350);
  };

  const close = () => {
    setToFriends(false);
    onClose();
  };

  if (toFriends) {
    return (
      <Sheet visible={visible} onClose={close} title={t('social.sendToSomeFriends')}>
        <SendToFriends
          list={list}
          onSent={(count) => {
            close();
            // After the sheet is gone: iOS can't show an alert while it animates out.
            setTimeout(() => Alert.alert(
              count > 0 ? t('social.sentTitle') : t('social.notSentTitle'),
              count > 0 ? t('social.sentBody', { title: list.title, count }) : t('social.notSentBody'),
            ), 400);
          }}
        />
        <Button variant="ghost" icon="chevron-back" label={t('social.otherWays')} onPress={() => setToFriends(false)} />
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={close} title={t('social.share')}>
      <Button icon="people" label={t('social.sendToSomeFriends')} onPress={() => setToFriends(true)} />
      {code ? (
        <>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>{upper(t('social.codeTitle'))}</Text>
            <Text selectable accessibilityLabel={t('social.codeA11y', { code: code.split('').join(' ') })} style={styles.code}>
              {code.slice(0, 3)} {code.slice(3)}
            </Text>
            <Text style={styles.hint}>{t('social.codeWhere')}</Text>
          </View>
          <View style={styles.row}>
            <Button style={styles.flex} variant="secondary" icon="copy-outline" label={t('social.copyCode')} onPress={() => copyText(code, t('social.codeCopiedShort', { code }))} />
            <Button style={styles.flex} icon="paper-plane-outline" label={t('social.sendEllipsis')} onPress={later(() => shareUrl(list.title, intro(code), codeLink(code)))} />
          </View>
        </>
      ) : error && error !== 'offline' ? (
        <View style={styles.codeBox}>
          <Text style={styles.errorTitle}>{t('social.shareRefused')}</Text>
          <Text style={styles.hint}>{error}</Text>
        </View>
      ) : error ? (
        <View style={styles.codeBox}>
          <Text style={styles.errorTitle}>{t('social.noConnection')}</Text>
          <Text style={styles.hint}>{t('social.codeFailed')}</Text>
          <View style={[styles.row, { marginTop: spacing.sm }]}>
            <Button
              style={styles.flex}
              variant="secondary"
              icon="refresh"
              label={t('social.retry')}
              onPress={() => {
                setState({ key: '' });
                setAttempt((n) => n + 1);
              }}
            />
            <Button
              style={styles.flex}
              icon="link-outline"
              label={t('social.sendLink')}
              onPress={later(() => shareUrl(list.title, t('social.challengeIntroLink', { title: list.title }), offlineLink(list, pseudo)))}
            />
          </View>
        </View>
      ) : (
        <View style={[styles.codeBox, { paddingVertical: spacing.xl }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.hint}>{t('social.creatingCode')}</Text>
        </View>
      )}
      {onShareImage ? <Button variant="ghost" icon="image-outline" label={imageLabel ?? t('social.shareImage')} onPress={later(onShareImage)} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  codeBox: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  codeLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  code: { color: colors.text, fontSize: 40, fontWeight: '800', letterSpacing: 4, fontVariant: ['tabular-nums'] },
  hint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  errorTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  flex: { flex: 1, paddingHorizontal: spacing.sm },
});
