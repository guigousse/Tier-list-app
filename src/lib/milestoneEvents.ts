import { FORKS, type Fork } from './badges';
import { milestones, type Reward, type Track } from './rewards';

/**
 * A step crossed on a reward path, to celebrate full screen (MilestoneCelebration):
 * an avatar item, credits, or a VS to choose. One reward per celebration, so each is
 * revealed and collected on its own.
 */
export type Celebration = { key: string; track: Track; at: number } & (
  | { kind: 'item'; reward: Reward }
  | { kind: 'credits'; credits: number }
  | { kind: 'vs'; fork: Fork }
);

const ORDER = { item: 0, credits: 1, vs: 2 } as const;

/**
 * What the player won going from `from` to `to` on a path (lists completed, or best
 * flame): every step in between, in order; at one step the items first, then the
 * credits, then the VS. A VS already chosen (`choices`) is not offered again.
 */
export function crossedSteps(track: Track, from: number, to: number, choices: Record<string, string>): Celebration[] {
  if (to <= from) return [];
  const events: Celebration[] = [];
  for (const step of milestones(track, to)) {
    if (step.at <= from || step.at > to) continue;
    for (const reward of step.rewards) events.push({ key: `${track}:${step.at}:${reward.part}:${reward.id}`, track, at: step.at, kind: 'item', reward });
    if (step.credits) events.push({ key: `${track}:${step.at}:credits`, track, at: step.at, kind: 'credits', credits: step.credits });
  }
  if (track === 'lists') {
    for (const fork of FORKS) {
      if (fork.at > from && fork.at <= to && !choices[fork.id]) events.push({ key: `vs:${fork.id}`, track, at: fork.at, kind: 'vs', fork });
    }
  }
  return events.sort((a, b) => a.at - b.at || ORDER[a.kind] - ORDER[b.kind]);
}

/** Said under the sticker chosen at a VS: the team's reason to be. */
export const TEAM_LINES: Record<string, string> = {
  pizza: 'Une part de bonheur, à partager (ou pas).',
  burger: 'Double cheddar, zéro regret.',
  dog: 'Toujours content de te voir.',
  cat: 'Ils sont si mignons.',
  ketchup: 'Rouge, sucré, indispensable.',
  mayo: 'Onctueuse et fière de l’être.',
  sea: 'Les pieds dans le sable, la tête au soleil.',
  mountain: 'L’air pur et la vue d’en haut.',
  sweet: 'La vie est trop courte pour s’en priver.',
  salty: 'Un apéro, et tout va mieux.',
  coffee: 'Rien ne commence avant le premier café.',
  tea: 'Infuser, respirer, savourer.',
  early: 'Le monde est à toi avant 7 heures.',
  night: 'Les meilleures idées arrivent à minuit.',
  pirate: 'À l’abordage, moussaillon !',
  ninja: 'Silencieux, rapide, invisible.',
};

export const teamLine = (badgeId: string) => TEAM_LINES[badgeId] ?? '';

export type Celebrated = { lists: number; flame: number };

/**
 * What to celebrate now, from the last steps celebrated and the player's progress (lists
 * completed, best flame), and what then counts as celebrated. Never back down: a list
 * deleted then completed again doesn't celebrate its step twice. First time (`null`):
 * nothing, the player's progress counts as celebrated.
 */
export function pendingCelebrations(celebrated: Celebrated | null, won: Celebrated, choices: Record<string, string>) {
  if (!celebrated) return { events: [] as Celebration[], celebrated: won };
  const events = [...crossedSteps('lists', celebrated.lists, won.lists, choices), ...crossedSteps('flame', celebrated.flame, won.flame, {})];
  return { events, celebrated: { lists: Math.max(celebrated.lists, won.lists), flame: Math.max(celebrated.flame, won.flame) } };
}

/**
 * Test tool (long press on « Version » in Settings): the lists path is celebrated again
 * from the start, its VS open again, while lists and flame stay as they are. The
 * credits already paid aren't paid twice: the server pays each step once.
 */
export function replayListSteps(
  state: { celebrated: Celebrated | null; badgeChoices: Record<string, string>; shownBadges: string[] },
  flame = 0,
) {
  return { celebrated: { lists: 0, flame: state.celebrated?.flame ?? flame }, badgeChoices: {}, shownBadges: [] as string[] };
}
