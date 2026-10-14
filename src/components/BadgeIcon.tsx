import { Ionicons } from '@expo/vector-icons';
import { memo, useId, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { colors } from '../constants/theme';
import type { Badge } from '../lib/badges';
import { stickerSvg } from '../lib/stickers';
import { Avatar } from './Avatar';

/**
 * A badge: its sticker, die-cut with a white border.
 * `state`: `locked` (not reached yet), `lost` (the other side was chosen).
 */
export const BadgeIcon = memo(function BadgeIcon({ badge, size, state }: { badge: Badge; size: number; state?: 'locked' | 'lost' }) {
  // Gradient ids unique to this sticker: on the web every sticker shares the page.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const xml = useMemo(() => stickerSvg(badge.id, uid), [badge.id, uid]);
  const chip = Math.max(16, Math.round(size * 0.34));
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ opacity: state === 'lost' ? 0.3 : state === 'locked' ? 0.45 : 1 }}>
        <SvgXml xml={xml} width={size} height={size} />
      </View>
      {state ? (
        <View style={[styles.chip, { width: chip, height: chip, borderRadius: chip / 2 }, state === 'lost' ? { backgroundColor: colors.danger } : null]}>
          <Ionicons name={state === 'lost' ? 'close' : 'lock-closed'} size={chip * (state === 'lost' ? 0.7 : 0.5)} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
});

/** An avatar with up to 3 badges stuck along its lower edge. */
export function AvatarWithBadges({ avatar, seed, size, badges }: { avatar: string; seed: string; size: number; badges: Badge[] }) {
  const pin = Math.round(size * 0.42);
  // Along the bottom arc of the avatar, slightly tilted like stickers stuck by hand.
  const spots = badges.length === 1 ? [0] : badges.length === 2 ? [-0.5, 0.5] : [-0.85, 0, 0.85];
  const tilts = [-12, 6, 14];
  return (
    <View style={{ width: size, height: size + (badges.length ? pin * 0.3 : 0) }}>
      <Avatar avatar={avatar} seed={seed} size={size} />
      {badges.slice(0, 3).map((b, i) => {
        const a = spots[i] * 0.8;
        const r = size / 2;
        return (
          <View
            key={b.id}
            accessibilityLabel={b.label}
            style={[styles.pin, { left: r + Math.sin(a) * r - pin / 2, top: r + Math.cos(a) * r - pin / 2, transform: [{ rotate: `${tilts[i]}deg` }] }]}
          >
            <BadgeIcon badge={b} size={pin} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#2D3047',
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: { position: 'absolute' },
});
