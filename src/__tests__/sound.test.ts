import { createAudioPlayer } from 'expo-audio';

import { playSparkle } from '../lib/sound';
import { useTierStore } from '../store/useTierStore';

jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(async () => {}),
  createAudioPlayer: jest.fn(() => ({ volume: 1, playing: false, seekTo: jest.fn(async () => {}), play: jest.fn(), pause: jest.fn() })),
}));

const create = createAudioPlayer as jest.Mock;

describe('AI wand sound', () => {
  it('plays the sparkle, softer than the click, unless sounds are off', async () => {
    useTierStore.setState({ settings: { ...useTierStore.getState().settings, sounds: false } });
    playSparkle();
    expect(create).not.toHaveBeenCalled();

    useTierStore.setState({ settings: { ...useTierStore.getState().settings, sounds: true } });
    playSparkle();
    expect(create).toHaveBeenCalled();
    const player = create.mock.results[0].value;
    expect(player.volume).toBeLessThan(0.5);
    await Promise.resolve();
    expect(player.play).toHaveBeenCalled();
  });
});
