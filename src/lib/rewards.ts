import { AVATAR_PARTS, itemLabel, type AvatarConfig, type Progress } from './avatar';
import { t } from './i18n/useT';

/** `lists`: public tier lists completed. `flame`: consecutive days of the daily tier list. */
export type Track = 'lists' | 'flame';

export type Reward = { part: keyof AvatarConfig; id: string; label: string };

/**
 * A step of a reward path: reached at `at`, with the avatar items it unlocks. Never
 * more than MAX_PER_STEP: past that, a celebration is a pile, not a reward.
 */
export type Milestone = { at: number; rewards: Reward[] };

export const MAX_PER_STEP = 3;

/** French name of each avatar part, for reward previews. */
export const PART_LABELS: Record<keyof AvatarConfig, string> = {
  face: 'Visage',
  skin: 'Peau',
  hair: 'Coiffure',
  hairColor: 'Couleur de cheveux',
  eyeShape: 'Yeux',
  eyes: 'Couleur des yeux',
  brows: 'Sourcils',
  mouth: 'Bouche',
  beard: 'Barbe',
  hat: 'Chapeau',
  glasses: 'Lunettes',
  bg: 'Fond',
};

/** An avatar part's name, in the language of the moment (PART_LABELS: the French source). */
export function partLabel(part: keyof AvatarConfig): string {
  return t(`play.part.${part}`);
}

/** A reward's name, in the language of the moment: looked up from its id, never stored. */
export function rewardLabel(reward: Reward): string {
  return itemLabel(reward.part, reward);
}

/** The steps of a path, from the avatar items locked behind it. */
export function milestones(track: Track): Milestone[] {
  const byStep = new Map<number, Reward[]>();
  for (const part of AVATAR_PARTS) {
    for (const item of part.items) {
      if (!item.unlock) continue;
      const at = track === 'flame' ? ('streak' in item.unlock ? item.unlock.streak : null) : 'completed' in item.unlock ? item.unlock.completed : null;
      if (at === null) continue;
      byStep.set(at, [...(byStep.get(at) ?? []), { part: part.key, id: item.id, label: item.label }]);
    }
  }
  return [...byStep.entries()].map(([at, rewards]) => ({ at, rewards })).sort((a, b) => a.at - b.at);
}

/**
 * Where the player stands on a path. The flame path follows the current flame (back
 * to 0 when it goes out) but its rewards, once won with the best flame, are kept.
 */
export function trackState(track: Track, progress: Progress & { streak: number }) {
  const value = track === 'flame' ? progress.streak : progress.completed;
  const won = track === 'flame' ? progress.bestStreak : progress.completed;
  const steps = milestones(track);
  const next = steps.find((m) => m.at > value) ?? null;
  return { value, won, steps, next };
}

/** Filled part (0 → 1) of the stretch of path going from step `from` to step `to`. */
export function stretchFill(value: number, from: number, to: number): number {
  if (to <= from) return value >= to ? 1 : 0;
  return Math.min(1, Math.max(0, (value - from) / (to - from)));
}

/**
 * How far the filled line goes on a path whose steps are evenly spaced: the index of
 * the last step reached, plus the share of the way to the next one.
 */
export function lineFill(value: number, ats: number[]): number {
  for (let i = 1; i < ats.length; i++) {
    if (value < ats[i]) return i - 1 + stretchFill(value, ats[i - 1], ats[i]);
  }
  return Math.max(0, ats.length - 1);
}

/** The player's avatar wearing a reward, to preview it. */
export function withReward(config: AvatarConfig, reward: Reward): AvatarConfig {
  return { ...config, [reward.part]: reward.id };
}
