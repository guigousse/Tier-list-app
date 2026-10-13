import type { Template } from '../constants/presets';
import { dailyTemplate } from '../store/useCatalog';
import type { TierList } from '../store/types';
import { popularVoteKey, rankingOf, useTierStore } from '../store/useTierStore';
import { createProfile, updateProfile, type DailyList, type FriendVote } from './api';
import { newId } from './id';

/** Avatars to choose from. */
export const AVATARS = ['🦊', '🐼', '🐸', '🐙', '🦁', '🐯', '🐨', '🐵', '🦄', '🐲', '🦉', '🐧', '🐳', '🦖', '👾', '🤖', '👻', '🎃', '🌵', '🍄', '🔥', '⚡', '🌈', '👑'];

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

/** Message to show for a failed social call. */
export function socialError(e: unknown): string {
  const message = e instanceof Error ? e.message : '';
  if (message.includes('invalid pseudo')) return 'Le pseudo doit faire 2 à 20 caractères : lettres, chiffres, espaces, « _ », « - » ou « . ».';
  if (message.includes('pseudo unavailable')) return 'Ce pseudo est très demandé : essayez-en un autre.';
  if (message.includes('player not found')) return 'Aucun joueur avec ce pseudo et ce numéro.';
  if (message.includes('cannot add yourself')) return 'C’est votre propre code !';
  if (message.includes('too many requests')) return 'Trop d’essais : réessayez dans un moment.';
  return 'Pas de connexion : réessayez dans un instant.';
}

/** Creates the player's profile, or updates it, and keeps it on the device. */
export async function saveProfile(pseudo: string, avatar: string): Promise<void> {
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
    if (template.day && l.daily?.day === template.day && l.daily.validatedAt) return rankingOf(l, l.daily.cardIds);
  }
  return null;
}
