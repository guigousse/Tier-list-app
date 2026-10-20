import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { useT } from '../lib/i18n/useT';
import { inviteFromText, type Invite } from '../lib/invite';
import { useTierStore } from '../store/useTierStore';
import { Button, Field, IconButton } from './ui';

const PASTE_HEIGHT = 48;

/**
 * Home card for a player who just installed the app from a friend's link: the share
 * page copied the code before sending them to the App Store, so pasting it opens the
 * list they were sent. Closing it ("Later" or ×) hides it for good.
 */
export function InviteCard() {
  const { t } = useT();
  const [typed, setTyped] = useState('');
  const [empty, setEmpty] = useState(false);
  const typedInvite = inviteFromText(typed);

  const open = (invite: Invite) => router.push({ pathname: '/import', params: invite });
  const dismiss = () => useTierStore.getState().updateSettings({ inviteAsked: true });

  const pasted = (text: string) => {
    const invite = inviteFromText(text);
    setEmpty(!invite);
    if (!invite) return;
    if ('c' in invite) setTyped(invite.c);
    open(invite);
  };

  // Elsewhere than iOS 16+, reading the clipboard is a plain call (iOS 14–15 show a banner,
  // Android 13+ a toast, a browser may ask): it only runs on this tap.
  const pasteByHand = () =>
    Clipboard.getStringAsync()
      .then(pasted)
      .catch(() => setEmpty(true));

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="gift-outline" size={22} color={colors.primary} />
        <Text style={styles.title}>{t('app.invite.title')}</Text>
        <IconButton icon="close" label={t('app.close')} onPress={dismiss} color={colors.textMuted} size={20} />
      </View>
      <Text style={styles.body}>{t('app.invite.body')}</Text>
      <Field
        value={typed}
        onChangeText={(v) => {
          setTyped(v);
          setEmpty(false);
        }}
        placeholder={t('app.invite.placeholder')}
        autoCorrect={false}
        autoCapitalize="characters"
        maxLength={120}
        returnKeyType="go"
        onSubmitEditing={() => typedInvite && open(typedInvite)}
        style={styles.input}
      />
      {empty ? <Text style={styles.empty}>{t('app.invite.empty')}</Text> : null}
      <View style={styles.row}>
        {Clipboard.isPasteButtonAvailable ? (
          // iOS 16+: the system paste control reads the clipboard without the permission alert.
          <Clipboard.ClipboardPasteButton
            onPress={(data) => (data.type === 'text' ? pasted(data.text) : setEmpty(true))}
            acceptedContentTypes={['plain-text']}
            displayMode="iconAndLabel"
            cornerStyle="medium"
            backgroundColor={colors.surfaceAlt}
            foregroundColor={colors.text}
            style={styles.paste}
          />
        ) : (
          <Button label={t('app.invite.paste')} icon="clipboard-outline" variant="secondary" onPress={pasteByHand} style={{ flex: 1 }} />
        )}
        <Button
          label={t('app.invite.open')}
          icon="arrow-forward"
          onPress={() => typedInvite && open(typedInvite)}
          disabled={!typedInvite}
          style={{ flex: 1 }}
        />
      </View>
      <Button label={t('app.later')} variant="ghost" onPress={dismiss} style={styles.later} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Apple's control has no intrinsic size here: without a height it doesn't show (expo-clipboard docs).
  paste: { flex: 1, height: PASTE_HEIGHT },
  later: { paddingVertical: spacing.xs },
  input: { fontSize: 18, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  empty: { color: colors.danger, fontSize: 14 },
});
