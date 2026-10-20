import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { useTierStore } from '../store/useTierStore';

export type Sound = 'click' | 'tick' | 'pop' | 'sparkle' | 'thunder' | 'coin' | 'complete' | 'key' | 'whoosh' | 'notify';

const SOURCES: Record<Sound, number> = {
  click: require('../../assets/sounds/click.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  // Made by scripts/generate-sparkle.py.
  sparkle: require('../../assets/sounds/sparkle.wav'),
  // Made by scripts/generate-purchase-sounds.py: a pack bought in the shop.
  thunder: require('../../assets/sounds/thunder.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  // Made by scripts/generate-reward-sounds.py: a reward reaching the player's profile.
  complete: require('../../assets/sounds/complete.wav'),
  // Made by scripts/generate-story-sounds.py: the welcome story (letters typed, sheets, a friend's answer).
  key: require('../../assets/sounds/key.wav'),
  whoosh: require('../../assets/sounds/whoosh.wav'),
  notify: require('../../assets/sounds/notify.wav'),
};
// Files peak at 0.8: these volumes give Broc's own levels (click 0.4, tick 0.18, pop 0.42).
// The sparkle lasts 0.65 s, ten times the click: softer, or it would cover the screen.
// The coin rings ~16 times in a row while the balance counts: low, or it would grate.
// The key comes ~12 times a second while a title is typed: very low, like the coin.
const VOLUMES: Record<Sound, number> = { click: 0.5, tick: 0.225, pop: 0.525, sparkle: 0.35, thunder: 0.6, coin: 0.3, complete: 0.4, key: 0.25, whoosh: 0.3, notify: 0.45 };
/** Players per sound, used in turn so quick repeats can overlap instead of cutting each other. */
const POOL: Record<Sound, number> = { click: 3, tick: 4, pop: 3, sparkle: 1, thunder: 1, coin: 3, complete: 1, key: 4, whoosh: 2, notify: 1 };
/** The same sound asked again within this time is one sound (two handlers on one tap). */
const SAME_TAP_MS = 60;

const pools: Partial<Record<Sound, AudioPlayer[]>> = {};
const zero = (): Record<Sound, number> => ({ click: 0, tick: 0, pop: 0, sparkle: 0, thunder: 0, coin: 0, complete: 0, key: 0, whoosh: 0, notify: 0 });
const next = zero();
const lastPlayed = zero();
let modeSet = false;

function pool(sound: Sound): AudioPlayer[] {
  if (!modeSet) {
    modeSet = true;
    // Respect the silent switch and never pause the user's music.
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }
  let players = pools[sound];
  if (!players) {
    players = Array.from({ length: POOL[sound] }, () => {
      const p = createAudioPlayer(SOURCES[sound]);
      p.volume = VOLUMES[sound];
      return p;
    });
    pools[sound] = players;
  }
  return players;
}

/** Plays a sound (unless sounds are off in the settings): the welcome story times its own. */
export function play(sound: Sound): void {
  if (!useTierStore.getState().settings.sounds) return;
  const now = Date.now();
  if (now - lastPlayed[sound] < SAME_TAP_MS) return;
  lastPlayed[sound] = now;
  try {
    const players = pool(sound);
    // A player that isn't playing, else the one used longest ago.
    const free = players.find((p) => !p.playing);
    const player = free ?? players[next[sound]];
    next[sound] = (players.indexOf(player) + 1) % players.length;
    if (player.playing) player.pause();
    // Rewind first, then play: playing before the rewind is done plays nothing (the
    // player is still at the end) or plays twice.
    player.seekTo(0).then(
      () => player.play(),
      () => player.play(),
    );
  } catch {
    // Audio unavailable: the app simply stays silent.
  }
}

/** Soft click played when a button is pressed (unless sounds are off in the settings). */
export function playClick(): void {
  play('click');
}

/** Light tick for each item passed in a carousel (unless sounds are off in the settings). */
export function playTick(): void {
  play('tick');
}

/** Balloon pop, when a badge disappears (unless sounds are off in the settings). */
export function playPop(): void {
  play('pop');
}

/** Glint of the AI wand, played instead of the click (unless sounds are off in the settings). */
export function playSparkle(): void {
  play('sparkle');
}

/** Loads the sounds ahead of time, so the first tap isn't silent. */
export function preloadSounds(): void {
  if (!useTierStore.getState().settings.sounds) return;
  try {
    (Object.keys(SOURCES) as Sound[]).forEach(pool);
  } catch {
    // Audio unavailable.
  }
}

/** A bolt striking: a pack bought lands in the shop. */
export function playThunder(): void {
  play('thunder');
}

/** A reward reaching the player's profile, after "Récupérer". */
export function playComplete(): void {
  play('complete');
}

/** One coin of the slot machine, while the balance counts up after a purchase. */
export function playCoin(): void {
  play('coin');
}
