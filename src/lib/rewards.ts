import { AVATAR_PARTS, type AvatarConfig, type Progress } from './avatar';

/** `lists`: public tier lists completed. `flame`: consecutive days of the daily tier list. */
export type Track = 'lists' | 'flame';

export type Reward = { part: keyof AvatarConfig; id: string; label: string };

/** A step of a reward path: reached at `at`, with the avatar items it unlocks. */
export type Milestone = { at: number; rewards: Reward[] };

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
  return [...byStep.entries()].sort(([a], [b]) => a - b).map(([at, rewards]) => ({ at, rewards }));
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

/** The player's avatar wearing a reward, to preview it. */
export function withReward(config: AvatarConfig, reward: Reward): AvatarConfig {
  return { ...config, [reward.part]: reward.id };
}
