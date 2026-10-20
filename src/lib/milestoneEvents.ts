import { FORKS, type Fork } from './badges';
import { t } from './i18n/useT';
import { milestones, type Reward, type Track } from './rewards';

/**
 * A step crossed on a reward path, to celebrate full screen (MilestoneCelebration):
 * its avatar items, all revealed together and collected at once, or a VS to choose.
 */
export type Celebration = { key: string; track: Track; at: number } & ({ kind: 'step'; rewards: Reward[] } | { kind: 'vs'; fork: Fork });

const ORDER = { step: 0, vs: 1 } as const;

/**
 * What the player won going from `from` to `to` on a path (lists completed, or best
 * flame): every step in between, in order; at one step the items first, then the VS.
 * A VS already chosen (`choices`) is not offered again.
 */
export function crossedSteps(track: Track, from: number, to: number, choices: Record<string, string>): Celebration[] {
  if (to <= from) return [];
  const events: Celebration[] = [];
  for (const step of milestones(track)) {
    if (step.at <= from || step.at > to || step.rewards.length === 0) continue;
    events.push({ key: `${track}:${step.at}`, track, at: step.at, kind: 'step', rewards: step.rewards });
  }
  if (track === 'lists') {
    for (const fork of FORKS) {
      if (fork.at > from && fork.at <= to && !choices[fork.id]) events.push({ key: `vs:${fork.id}`, track, at: fork.at, kind: 'vs', fork });
    }
  }
  return events.sort((a, b) => a.at - b.at || ORDER[a.kind] - ORDER[b.kind]);
}

/** Said under the sticker chosen at a VS: the team's reason to be (French source; shown through teamLine). */
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

/** The team's line in the language of the moment; nothing for a badge this app doesn't know. */
export const teamLine = (badgeId: string) => (TEAM_LINES[badgeId] ? t(`play.team.${badgeId}`) : '');

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
 * from the start, its VS open again, while lists and flame stay as they are.
 */
export function replayListSteps(
  state: { celebrated: Celebrated | null; badgeChoices: Record<string, string>; shownBadges: string[] },
  flame = 0,
) {
  return { celebrated: { lists: 0, flame: state.celebrated?.flame ?? flame }, badgeChoices: {}, shownBadges: [] as string[] };
}
