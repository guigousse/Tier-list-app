import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { useTierStore } from '../store/useTierStore';

let player: AudioPlayer | null = null;

function clickPlayer(): AudioPlayer {
  if (!player) {
    // Respect the silent switch and never pause the user's music.
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    player = createAudioPlayer(require('../../assets/sounds/click.wav'));
    player.volume = 0.45;
  }
  return player;
}

/** Short click played when a button is pressed (unless sounds are off in the settings). */
export function playClick(): void {
  if (!useTierStore.getState().settings.sounds) return;
  try {
    const p = clickPlayer();
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // Audio unavailable: buttons simply stay silent.
  }
}

// A few players in turn, so quick ticks (scrolling a carousel) can overlap.
const ticks: AudioPlayer[] = [];
let nextTick = 0;

/** Soft tick for each item passed in a carousel (unless sounds are off in the settings). */
export function playTick(): void {
  if (!useTierStore.getState().settings.sounds) return;
  try {
    if (ticks.length === 0) {
      clickPlayer();
      for (let i = 0; i < 3; i++) {
        const p = createAudioPlayer(require('../../assets/sounds/tick.wav'));
        p.volume = 0.35;
        ticks.push(p);
      }
    }
    const p = ticks[nextTick];
    nextTick = (nextTick + 1) % ticks.length;
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // Audio unavailable: the carousel simply stays silent.
  }
}

let popPlayer: AudioPlayer | null = null;

/** Balloon pop, when a badge disappears (unless sounds are off in the settings). */
export function playPop(): void {
  if (!useTierStore.getState().settings.sounds) return;
  try {
    clickPlayer();
    if (!popPlayer) {
      popPlayer = createAudioPlayer(require('../../assets/sounds/pop.wav'));
      popPlayer.volume = 0.8;
    }
    popPlayer.seekTo(0).catch(() => {});
    popPlayer.play();
  } catch {
    // Audio unavailable: the badge pops silently.
  }
}
