import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { fetchFriends, sendList, type PublicProfile } from '../lib/api';
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
  const secret = useTierStore((s) => s.profile?.secret);
  const [friends, setFriends] = useState<PublicProfile[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!secret) return;
    fetchFriends(secret).then(
      (data) => setFriends(data.friends.filter((f) => !f.hidden)),
      (e) => setError(socialError(e)),
    );
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
    return <Text style={styles.hint}>Créez votre profil dans Social pour envoyer vos tier lists à vos amis.</Text>;
  }
  if (cards === 0) {
    return <Text style={styles.hint}>Ajoutez des cartes à la tier list avant de l’envoyer.</Text>;
  }
  if (cards > 100) {
    return <Text style={styles.hint}>Une tier list envoyée à des amis peut avoir 100 cartes au plus.</Text>;
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.hint}>
        Vos amis la reçoivent à classer, sans voir votre classement. Une fois classée, vous comparez vos deux classements.
        {photos ? ' Les photos ne sont pas envoyées : seuls les noms des cartes le sont.' : ''}
      </Text>
      {friends === null && !error ? (
        <ActivityIndicator color={colors.primary} />
      ) : friends && friends.length === 0 ? (
        <Text style={styles.hint}>Vous n’avez pas encore d’amis : ajoutez-en dans Social avec leur code.</Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {(friends ?? []).map((f) => {
            const on = chosen.has(f.id);
            return (
              <Clickable
                key={f.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${f.pseudo} #${f.tag}`}
                onPress={() => toggle(f.id)}
                style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.85 }]}
              >
                <Avatar avatar={f.avatar} seed={f.id} size={40} />
                <Text numberOfLines={1} style={styles.name}>
                  {f.pseudo}
                  <Text style={styles.tag}> #{f.tag}</Text>
                </Text>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? colors.primary : colors.textMuted} />
              </Clickable>
            );
          })}
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        icon="paper-plane"
        label={busy ? 'Envoi…' : chosen.size > 1 ? `Envoyer à ${chosen.size} amis` : 'Envoyer'}
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
  name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  tag: { color: colors.textMuted, fontWeight: '500' },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});
