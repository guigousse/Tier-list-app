import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { fetchFriends, mailSentTo, sendList, type PublicProfile } from '../lib/api';
import { useT } from '../lib/i18n/useT';
import { isSameList } from '../lib/sentRanks';
import { socialError } from '../lib/social';
import type { TierList } from '../store/types';
import { useMail } from '../store/useMail';
import { useTierStore } from '../store/useTierStore';
import { Avatar } from './Avatar';
import { Clickable } from './Clickable';
import { Button } from './ui';

type Props = {
  list: TierList;
  /** Called once sent, with how many friends got it. */
  onSent: (count: number) => void;
};

/** Picks friends and sends them `list` to rank (shown inside the share sheet). */
export function SendToFriends({ list, onSent }: Props) {
  const { t } = useT();
  const secret = useTierStore((s) => s.profile?.secret);
  const [friends, setFriends] = useState<PublicProfile[] | null>(null);
  // Friends who already got this very list: where it stands with them.
  const [already, setAlready] = useState<Map<string, 'sent' | 'ranked'>>(new Map());
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!secret) return;
    Promise.all([fetchFriends(secret), mailSentTo(secret, list).catch(() => [])]).then(
      ([data, sent]) => {
        // The server only knows the list in the card order it was sent in; a list ranked
        // differently since is found again among the sent ones.
        const local = useMail.getState().outbox.filter((m) => isSameList(list, m.list));
        setAlready(new Map([...local.map((m) => [m.friend.id, m.status] as const), ...sent.map((m) => [m.friend, m.status] as const)]));
        setFriends(data.friends.filter((f) => !f.hidden));
      },
      (e) => setError(socialError(e)),
    );
    // The list as it is when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  const cards = Object.keys(list.cards).length;
  const photos = Object.values(list.cards).some((c) => c.imageName);

  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const send = async () => {
    if (!secret || chosen.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const count = await sendList(secret, [...chosen], list);
      useMail.getState().refresh();
      onSent(count);
    } catch (e) {
      setError(socialError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!secret) {
    return <Text style={styles.hint}>{t('social.noProfileHint')}</Text>;
  }
  if (cards === 0) {
    return <Text style={styles.hint}>{t('social.noCards')}</Text>;
  }
  if (cards > 100) {
    return <Text style={styles.hint}>{t('social.tooManyCards')}</Text>;
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.hint}>
        {t('social.sendHint')}
        {photos ? ` ${t('social.noPhotos')}` : ''}
      </Text>
      {friends === null && !error ? (
        <ActivityIndicator color={colors.primary} />
      ) : friends && friends.length === 0 ? (
        <Text style={styles.hint}>{t('social.noFriendsYet')}</Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {(friends ?? []).map((f) => {
            const on = chosen.has(f.id);
            const sent = already.get(f.id);
            return (
              <Clickable
                key={f.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: Boolean(sent) }}
                accessibilityLabel={sent ? t('social.alreadySentA11y', { name: `${f.pseudo} #${f.tag}` }) : `${f.pseudo} #${f.tag}`}
                disabled={Boolean(sent)}
                onPress={() => toggle(f.id)}
                style={({ pressed }) => [styles.row, on && styles.rowOn, sent && { opacity: 0.6 }, pressed && { opacity: 0.85 }]}
              >
                <Avatar avatar={f.avatar} seed={f.id} size={40} />
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.name}>
                    {f.pseudo}
                    <Text style={styles.tag}> #{f.tag}</Text>
                  </Text>
                  {sent ? <Text style={styles.already}>{sent === 'ranked' ? t('social.alreadyRanked') : t('social.alreadyPending')}</Text> : null}
                </View>
                {sent ? (
                  <Ionicons name="checkmark-done" size={22} color={colors.textMuted} />
                ) : (
                  <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? colors.primary : colors.textMuted} />
                )}
              </Clickable>
            );
          })}
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        icon="paper-plane"
        label={busy ? t('social.sending') : chosen.size > 1 ? t('social.sendToN', { n: chosen.size }) : t('social.send')}
        disabled={chosen.size === 0 || busy}
        onPress={send}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowOn: { borderColor: colors.primary },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  already: { color: colors.textMuted, fontSize: 13 },
  tag: { color: colors.textMuted, fontWeight: '500' },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
