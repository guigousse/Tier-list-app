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
