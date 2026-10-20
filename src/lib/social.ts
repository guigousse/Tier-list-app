import { Alert } from 'react-native';

import type { Template } from '../constants/presets';
import { dailyTemplate } from '../store/useCatalog';
import type { TierList } from '../store/types';
import { popularVoteKey, rankingOf, useTierStore } from '../store/useTierStore';
import { blockPlayer, createProfile, deleteProfile, reportPlayer, updateProfile, type DailyList, type FriendVote } from './api';
import { t } from './i18n/useT';
import { newId } from './id';
import { syncBadges } from './badges';
import { restoreIdentity, saveIdentity } from './identity';
import { syncPushToken } from './push';

const AVATAR_COLORS = ['#7C5CFF', '#FF7F7F', '#FFBF7F', '#4CC9C0', '#5AA9FF', '#B45CFF', '#2EAD6B', '#FF7FB0'];

/** Background colour of an avatar, stable for a player. */
export function avatarColor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** "Pseudo#1234". */
export function friendCode(p: { pseudo: string; tag: number }): string {
  return `${p.pseudo}#${p.tag}`;
}

/** Reads a friend code typed by the player ("Pseudo#1234", spaces tolerated), or null. */
export function parseFriendCode(text: string): { pseudo: string; tag: number } | null {
  const m = text.trim().match(/^(.{2,20}?)\s*#\s*(\d{4})$/);
  return m ? { pseudo: m[1].trim(), tag: Number(m[2]) } : null;
}

// The server answers with English codes, never with text: the app words them in the player's language.
const SERVER_ERRORS: [string, string][] = [
  ['pseudo refused', 'social.error.pseudoRefused'],
  ['invalid avatar', 'social.error.invalidAvatar'],
  ['invalid pseudo', 'social.error.invalidPseudo'],
  ['pseudo unavailable', 'social.error.pseudoUnavailable'],
  ['player not found', 'social.error.playerNotFound'],
  ['cannot add yourself', 'social.error.self'],
  ['player blocked', 'social.error.playerBlocked'],
  ['unknown profile', 'social.error.unknownProfile'],
  ['content refused', 'social.error.contentRefused'],
  ['mail not found', 'social.error.mailNotFound'],
  ['mail expired', 'social.error.mailExpired'],
  ['too many requests', 'social.error.tooMany'],
];

/** Message to show for a failed social call. */
export function socialError(e: unknown): string {
  const message = e instanceof Error ? e.message : '';
  const known = SERVER_ERRORS.find(([code]) => message.includes(code));
  return t(known ? known[1] : 'social.error.offline');
}

/** Creates the player's profile, or updates it, and keeps it on the device. */
export async function saveProfile(pseudo: string, avatar: string): Promise<void> {
  // After a reinstall the Keychain may hold a profile that couldn't be fetched at launch
  // (offline): that one is updated, rather than a second profile made.
  if (!useTierStore.getState().profile) await restoreIdentity();
  const { profile, deviceId, setProfile } = useTierStore.getState();
  if (profile) {
    const saved = await updateProfile(profile.secret, pseudo, avatar);
    setProfile({ ...profile, pseudo: saved.pseudo, tag: saved.tag, avatar: saved.avatar });
    return;
  }
  // Long random secret: it is what proves the profile belongs to this install.
  const secret = `${newId()}${newId()}`.replace(/-/g, '');
  const saved = await createProfile(deviceId, secret, pseudo, avatar);
  setProfile({ id: saved.id, secret, pseudo: saved.pseudo, tag: saved.tag, avatar: saved.avatar });
  await saveIdentity();
  // Notifications about friends, now that there is a profile.
  syncPushToken();
  // Badges chosen before the profile existed.
  syncBadges();
}

/** Agreement between two rankings of the same cards, from 0 to 100 (same tier everywhere: 100). */
export function agreement(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += 1 - Math.abs(a[i] - b[i]) / 4;
  return Math.round((sum / n) * 100);
}

/** The tier list a friend's ranking is about, if this app knows it. */
export function voteTemplate(vote: FriendVote, templates: Template[], dailies: DailyList[]): Template | undefined {
  if (vote.key.startsWith('daily:')) {
    const daily = dailies.find((d) => d.day === vote.key.slice(6));
    return daily ? dailyTemplate(daily) : undefined;
  }
  return templates.find((t) => popularVoteKey(t) === vote.key);
}

/** The player's own validated ranking of a tier list, if any (popular copy or daily copy). */
export function myRanks(template: Template, lists: Record<string, TierList>): number[] | null {
  const voteKey = popularVoteKey(template);
  for (const l of Object.values(lists)) {
    if (l.popular?.voteKey === voteKey && l.popular.validatedRanks) return l.popular.validatedRanks;
    if (template.day && l.daily?.day === template.day && l.daily.validatedAt) return l.daily.validatedRanks ?? rankingOf(l, l.daily.cardIds);
  }
  return null;
}

/** Asks whether to report a player (which also blocks them) or only block them, then calls `done`. */
export function confirmReport(player: { id: string; pseudo: string; tag: number }, done: () => void): void {
  const secret = useTierStore.getState().profile?.secret;
  if (!secret) return;
  const run = (call: Promise<void>, message: string) =>
    call.then(
      () => {
        Alert.alert(t('social.done'), message);
        done();
      },
      (e) => Alert.alert(t('social.oops'), socialError(e)),
    );
  const report = (reason: 'pseudo' | 'avatar') =>
    run(reportPlayer(secret, player.id, reason), t('social.reportSent'));
  Alert.alert(
    t('social.reportTitle'),
    t('social.reportBody', { code: friendCode(player) }),
    [
      { text: t('social.reportPseudo'), style: 'destructive', onPress: () => report('pseudo') },
      { text: t('social.reportAvatar'), style: 'destructive', onPress: () => report('avatar') },
      { text: t('social.blockOnly'), style: 'destructive', onPress: () => run(blockPlayer(secret, player.id), t('social.blockedDone')) },
      { text: t('social.cancel'), style: 'cancel' },
    ],
  );
}

/**
 * Deletes the player's profile online (friends, blocks, votes), then forgets it on
 * this device and in the Keychain. The tier lists stay on the device.
 */
export async function deleteMyProfile(): Promise<void> {
  const { profile } = useTierStore.getState();
  if (!profile) return;
  try {
    await deleteProfile(profile.secret);
  } catch (e) {
    // Already gone online: forget it here too.
    if (!(e instanceof Error && e.message.includes('unknown profile'))) throw e;
  }
  // A new device id, so later votes aren't linked to the deleted ones.
  useTierStore.setState({ profile: null, deviceId: newId() });
  await saveIdentity();
}
