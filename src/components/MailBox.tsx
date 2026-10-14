import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { relativeTime } from '../lib/format';
import { confirmIgnore, confirmReportMail, openMail } from '../lib/mail';
import { isToRank, mailAgreement, useMail, type Mail } from '../store/useMail';
import { Avatar } from './Avatar';
import { Clickable } from './Clickable';
import { IconButton, SectionTitle } from './ui';

/** One list: the friend, its title, and where it stands. */
function MailRow({ mail, received }: { mail: Mail; received: boolean }) {
  const toRank = received && isToRank(mail);
  const ranked = mail.status === 'ranked' && mail.senderRanks && mail.recipientRanks;
  const score = ranked ? mailAgreement(mail.senderRanks!, mail.recipientRanks!, mail.list.tiers.length) : null;
  const fresh = !received && ranked && !mail.seen;
  const when = relativeTime(Date.parse(mail.sentAt));
  const subtitle = received
    ? `De ${mail.friend.pseudo} · ${mail.auto ? 'déjà classée' : when}`
    : ranked
      ? `${mail.friend.pseudo} l’a classée`
      : `À ${mail.friend.pseudo} · en attente`;

  const more = () =>
    Alert.alert(mail.list.title, `Envoyée par ${mail.friend.pseudo}`, [
      { text: 'Ignorer', onPress: () => confirmIgnore(mail) },
      { text: 'Signaler', style: 'destructive', onPress: () => confirmReportMail(mail) },
      { text: 'Annuler', style: 'cancel' },
    ]);

  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={`${mail.list.title}, ${subtitle}${toRank ? ', à classer' : score !== null ? `, ${score} % d’accord` : ''}`}
      onPress={() => openMail(mail, received)}
      style={({ pressed }) => [styles.row, (toRank || fresh) && styles.rowNew, pressed && { opacity: 0.85 }]}
    >
      <Avatar avatar={mail.friend.avatar} seed={mail.friend.id} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={styles.title}>
          {mail.list.title}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
      {toRank ? (
        <>
          <View style={styles.pill}>
            <Text style={styles.pillText}>À classer</Text>
          </View>
          <IconButton icon="ellipsis-horizontal" label="Ignorer ou signaler" onPress={more} color={colors.textMuted} />
        </>
      ) : score !== null ? (
        <View style={[styles.score, fresh && styles.scoreFresh]}>
          <Text style={styles.scoreText}>{score} %</Text>
          {fresh ? <View style={styles.dot} /> : null}
        </View>
      ) : (
        <Ionicons name="hourglass-outline" size={18} color={colors.textMuted} />
      )}
    </Clickable>
  );
}

/** Tier lists received from friends (to rank, then compared) and sent to them. */
export function MailBox() {
  const inbox = useMail((s) => s.inbox);
  const outbox = useMail((s) => s.outbox);
  const loaded = useMail((s) => s.loaded);
  const offline = useMail((s) => s.offline);

  if (!loaded) return <ActivityIndicator color={colors.primary} />;

  const toRank = inbox.filter(isToRank);
  const rankedIn = inbox.filter((m) => !isToRank(m));

  return (
    <View style={{ gap: spacing.xl }}>
      {offline ? <Text style={styles.hint}>Pas de connexion : vos listes s’afficheront dès que vous serez en ligne.</Text> : null}

      <View style={{ gap: spacing.sm }}>
        <SectionTitle>Reçues{toRank.length ? ` · ${toRank.length} à classer` : ''}</SectionTitle>
        {inbox.length === 0 ? (
          <Text style={styles.hint}>Les tier lists que vos amis vous envoient arrivent ici : classez-les, puis comparez vos classements.</Text>
        ) : (
          [...toRank, ...rankedIn].map((m) => <MailRow key={m.id} mail={m} received />)
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionTitle>Envoyées</SectionTitle>
        {outbox.length === 0 ? (
          <Text style={styles.hint}>Pour envoyer une de vos tier lists, ouvrez-la puis menu → Partager → Envoyer à des amis.</Text>
        ) : (
          outbox.map((m) => <MailRow key={m.id} mail={m} received={false} />)
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowNew: { borderColor: colors.primary },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 13 },
  pill: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: colors.primaryText, fontSize: 13, fontWeight: '700' },
  score: { minWidth: 52, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  scoreFresh: { backgroundColor: 'rgba(124, 92, 255, 0.2)' },
  scoreText: { color: colors.text, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  dot: { position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B4E' },
});
