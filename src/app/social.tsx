import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { AvatarWithBadges } from '../components/BadgeIcon';
import { MailBox } from '../components/MailBox';
import { Clickable } from '../components/Clickable';
import { ProfileForm } from '../components/ProfileForm';
import { ProfileRewards } from '../components/profile/ProfileRewards';
import { Button, IconButton, SectionTitle, Sheet } from '../components/ui';
import { colors, radius, spacing } from '../constants/theme';
import { fetchFriends, removeFriend, respondFriendRequest, sendFriendRequest, unblockPlayer, type Friends, type PublicProfile } from '../lib/api';
import { useResponsive } from '../lib/layout';
import { copyText, shareUrl, SHARE_HOST } from '../lib/share';
import { knownBadges, usePendingBadges } from '../lib/badges';
import { confirmReport, friendCode, parseFriendCode, socialError } from '../lib/social';
import { isToRank, useMail, useUnreadMail } from '../store/useMail';
import { useTierStore } from '../store/useTierStore';

function PlayerRow({ player, onPress, right }: { player: PublicProfile; onPress?: () => void; right?: React.ReactNode }) {
  return (
    <Clickable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.85 }]}
    >
      <Avatar avatar={player.avatar} seed={player.id} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.rowName}>
          {player.pseudo}
          <Text style={styles.rowTag}> #{player.tag}</Text>
        </Text>
        <Text style={styles.rowMeta}>
          {player.completed} liste{player.completed > 1 ? 's' : ''} complétée
          {player.completed > 1 ? 's' : ''}
        </Text>
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null)}
    </Clickable>
  );
}

type Tab = 'friends' | 'challenges' | 'rewards';

function initialTab(param: string | undefined): Tab {
  if (param === 'lists' || param === 'challenges') return 'challenges';
  if (param === 'friends' || param === 'rewards') return param;
  // Lists waiting to be ranked: open on them.
  return useMail.getState().inbox.some(isToRank) ? 'challenges' : 'friends';
}

/** The player's profile: friends, challenges (tier lists sent between friends), rewards and statistics. */
export default function Social() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const profile = useTierStore((s) => s.profile);
  const [data, setData] = useState<Friends | null>(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [editing, setEditing] = useState(false);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(() => initialTab(params.tab));
  const unread = useUnreadMail();
  const pendingBadges = usePendingBadges();
  const shownBadges = useTierStore((s) => s.shownBadges);
  // Reward paths go up from the bottom of the page: scrolled to where the player stands.
  const scroll = useRef<ScrollView>(null);
  const sizes = useRef({ content: 0, view: 0, fromBottom: null as number | null });
  const reveal = useCallback(() => {
    const { content, view, fromBottom } = sizes.current;
    if (fromBottom === null || !content || !view) return;
    const y = content - (insets.bottom + spacing.xl) - fromBottom - view / 2;
    scroll.current?.scrollTo({ y: Math.max(0, Math.min(y, content - view)), animated: false });
  }, [insets.bottom]);
  const showReward = useCallback(
    (fromBottom: number) => {
      sizes.current.fromBottom = fromBottom;
      reveal();
    },
    [reveal],
  );
  const changeTab = (next: Tab) => {
    sizes.current.fromBottom = null;
    setTab(next);
  };

  const load = useCallback(async () => {
    const secret = useTierStore.getState().profile?.secret;
    if (!secret) return;
    setLoading(true);
    try {
      setData(await fetchFriends(secret));
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      useMail.getState().refresh();
    }, [load]),
  );

  if (!profile) {
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          column,
          {
            padding: gutter,
            gap: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
          },
        ]}
      >
        <Text style={styles.intro}>Créez votre profil de joueur pour ajouter des amis et comparer vos classements.</Text>
        <ProfileForm onSaved={load} />
      </ScrollView>
    );
  }

  const myCode = friendCode(profile);

  const add = async () => {
    const parsed = parseFriendCode(code);
    if (!parsed) {
      setMessage({
        text: 'Saisissez le pseudo et le numéro, par exemple Guigou#1234.',
        ok: false,
      });
      return;
    }
    try {
      const result = await sendFriendRequest(profile.secret, parsed.pseudo, parsed.tag);
      setMessage({
        text:
          result === 'accepted'
            ? 'Vous êtes maintenant amis !'
            : result === 'already_friends'
              ? 'Vous êtes déjà amis.'
              : 'Demande envoyée. Elle apparaîtra quand votre ami l’acceptera.',
        ok: true,
      });
      setCode('');
      load();
    } catch (e) {
      setMessage({ text: socialError(e), ok: false });
    }
  };

  const respond = async (other: string, accept: boolean) => {
    try {
      await respondFriendRequest(profile.secret, other, accept);
      load();
    } catch (e) {
      Alert.alert('Oups', socialError(e));
    }
  };

  const cancel = (p: PublicProfile) =>
    Alert.alert('Annuler la demande ?', `${friendCode(p)} ne verra plus votre demande.`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Annuler la demande',
        style: 'destructive',
        onPress: () => removeFriend(profile.secret, p.id).then(load, () => {}),
      },
    ]);

  const unblock = (p: PublicProfile) =>
    Alert.alert('Débloquer ce joueur ?', `${friendCode(p)} pourra de nouveau vous envoyer une demande d’ami.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Débloquer',
        onPress: () => unblockPlayer(profile.secret, p.id).then(load, (e) => Alert.alert('Oups', socialError(e))),
      },
    ]);

  return (
    <ScrollView
      ref={scroll}
      onLayout={(e) => {
        sizes.current.view = e.nativeEvent.layout.height;
      }}
      onContentSizeChange={(_, h) => {
        sizes.current.content = h;
        reveal();
      }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={loading && Boolean(data)}
          onRefresh={() => {
            load();
            useMail.getState().refresh();
          }}
          tintColor={colors.textMuted}
        />
      }
      contentContainerStyle={[
        column,
        {
          padding: gutter,
          gap: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
    >
      <View style={styles.me}>
        <AvatarWithBadges avatar={profile.avatar} seed={profile.id} size={64} badges={knownBadges(shownBadges)} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={styles.meName}>
            {profile.pseudo}
            <Text style={styles.rowTag}> #{profile.tag}</Text>
          </Text>
          <Text style={styles.rowMeta}>
            {data ? `${data.me.completed} liste${data.me.completed > 1 ? 's' : ''} complétée${data.me.completed > 1 ? 's' : ''}` : 'Votre code ami : ' + myCode}
          </Text>
        </View>
        <IconButton icon="create-outline" label="Modifier le profil" onPress={() => setEditing(true)} />
      </View>
      {data?.me.hidden ? (
        <Text style={styles.warning}>Votre profil a été masqué après plusieurs signalements : les autres joueurs voient « Joueur signalé ».</Text>
      ) : null}
      <View style={styles.actions}>
        <Button style={{ flex: 1 }} variant="secondary" icon="copy-outline" label="Mon code" onPress={() => copyText(myCode, `${myCode} est copié.`)} />
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          icon="paper-plane-outline"
          label="Inviter"
          onPress={() => shareUrl('Tiercraft', `Ajoute-moi en ami sur Tiercraft : ${myCode}`, `https://${SHARE_HOST}`)}
        />
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {(
          [
            { key: 'friends', label: 'Amis', badge: data?.incoming.length ?? 0, grow: 1 },
            { key: 'challenges', label: 'Défis', badge: unread, grow: 1 },
            // Wider: the longest label, often with a badge.
            { key: 'rewards', label: 'Récompenses', badge: pendingBadges, grow: 1.5 },
          ] as const
        ).map((t) => (
          <Clickable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
            accessibilityLabel={t.badge ? `${t.label}, ${t.badge} nouveauté${t.badge > 1 ? 's' : ''}` : t.label}
            onPress={() => changeTab(t.key)}
            style={[styles.tab, { flex: t.grow }, tab === t.key && styles.tabSelected]}
          >
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.tabText, tab === t.key && { color: colors.text }]}>
              {t.label}
            </Text>
            {t.badge ? (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{t.badge > 9 ? '9+' : t.badge}</Text>
              </View>
            ) : null}
          </Clickable>
        ))}
      </View>

      {tab === 'challenges' ? (
        <MailBox />
      ) : tab === 'rewards' ? (
        <ProfileRewards onCurrent={showReward} />
      ) : (
        <>
          <View style={{ gap: spacing.sm }}>
            <SectionTitle>Ajouter un ami</SectionTitle>
            <View style={styles.addRow}>
              <TextInput
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  setMessage(null);
                }}
                placeholder="Pseudo#1234"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={add}
                style={styles.input}
              />
              <Button icon="person-add-outline" label="Ajouter" onPress={add} disabled={!code.trim()} style={{ paddingHorizontal: spacing.md }} />
            </View>
            {message ? <Text style={[styles.message, { color: message.ok ? '#2EAD6B' : colors.danger }]}>{message.text}</Text> : null}
          </View>

          {offline && !data ? (
            <Text style={styles.intro}>Pas de connexion : vos amis s’afficheront dès que vous serez en ligne.</Text>
          ) : !data ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              {data.incoming.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionTitle>Demandes reçues</SectionTitle>
                  {data.incoming.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      right={
                        <View style={styles.respond}>
                          <IconButton icon="flag-outline" label="Signaler ou bloquer" color={colors.textMuted} onPress={() => confirmReport(p, load)} />
                          <IconButton icon="close" label="Refuser" color={colors.textMuted} onPress={() => respond(p.id, false)} />
                          <IconButton icon="checkmark" label="Accepter" color="#2EAD6B" onPress={() => respond(p.id, true)} />
                        </View>
                      }
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ gap: spacing.sm }}>
                <SectionTitle>Amis{data.friends.length ? ` (${data.friends.length})` : ''}</SectionTitle>
                {data.friends.length === 0 ? (
                  <Text style={styles.intro}>Ajoutez un ami avec son code, ou envoyez-lui le vôtre : {myCode}</Text>
                ) : (
                  data.friends.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      onPress={() =>
                        router.push({
                          pathname: '/friend/[id]',
                          params: { id: p.id },
                        })
                      }
                    />
                  ))
                )}
              </View>

              {data.outgoing.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionTitle>Demandes envoyées</SectionTitle>
                  {data.outgoing.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      right={<IconButton icon="close" label="Annuler la demande" color={colors.textMuted} onPress={() => cancel(p)} />}
                    />
                  ))}
                </View>
              ) : null}

              {data.blocked?.length ? (
                <View style={{ gap: spacing.sm }}>
                  <SectionTitle>Joueurs bloqués</SectionTitle>
                  {data.blocked.map((p) => (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      right={<Button variant="secondary" label="Débloquer" onPress={() => unblock(p)} style={{ paddingHorizontal: spacing.md }} />}
                    />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </>
      )}

      <Sheet visible={editing} onClose={() => setEditing(false)} title="Mon profil">
        <ProfileForm
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  me: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  meName: { color: colors.text, fontSize: 22, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: -spacing.md },
  addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  message: { fontSize: 14, lineHeight: 19 },
  warning: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 19,
    marginTop: -spacing.md,
  },
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
  rowName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  rowTag: { color: colors.textMuted, fontWeight: '500' },
  rowMeta: { color: colors.textMuted, fontSize: 13 },
  respond: { flexDirection: 'row', gap: spacing.xs },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 4,
    gap: 4,
    marginTop: -spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
    minHeight: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelected: { backgroundColor: colors.surfaceAlt },
  tabText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#FF3B4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
