import { Pressable, type GestureResponderEvent, type PressableProps, type View } from 'react-native';
import type { Ref } from 'react';

import { playClick } from '../lib/sound';

/** Pressable that plays the button click sound before running `onPress`. */
export function Clickable({ onPress, ref, ...props }: PressableProps & { ref?: Ref<View> }) {
  return (
    <Pressable
      ref={ref}
      {...props}
      onPress={
        onPress
          ? (e: GestureResponderEvent) => {
              playClick();
              onPress(e);
            }
          : undefined
      }
    />
  );
}
