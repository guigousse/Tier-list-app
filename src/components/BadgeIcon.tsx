import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import type { Badge } from '../lib/badges';
import { Avatar } from './Avatar';

/**
 * A badge: its emoji on a dark disc set in a shiny ring of its colours.
 * `state`: `locked` (not reached), `lost` (the other side was chosen).
 */
export const BadgeIcon = memo(function BadgeIcon({ badge, size, state }: { badge: Badge; size: number; state?: 'locked' | 'lost' }) {
  const ring = Math.max(2, Math.round(size * 0.09));
  const dim = state !== undefined;
  return (
    <View style={{ width: size, height: size, opacity: state === 'lost' ? 0.35 : 1 }}>
      <LinearGradient
        colors={dim ? ['#4A505E', '#2C313C'] : badge.colors}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[styles.ring, { borderRadius: size / 2, padding: ring }]}
      >
        <View style={[styles.disc, { borderRadius: size / 2 }]}>
          <Text style={{ fontSize: size * 0.5, opacity: dim ? 0.45 : 1 }}>{badge.emoji}</Text>
          {/* Shine on the top left, like a medal. */}
          {!dim ? <View pointerEvents="none" style={[styles.shine, { width: size * 0.3, height: size * 0.16, top: size * 0.12, left: size * 0.18 }]} /> : null}
        </View>
      </LinearGradient>
      {state === 'lost' ? (
        <View style={[styles.cross, { width: size * 0.42, height: size * 0.42, borderRadius: size }]}>
          <Ionicons name="close" size={size * 0.3} color="#FFFFFF" />
        </View>
      ) : state === 'locked' ? (
        <View style={[styles.cross, { width: size * 0.4, height: size * 0.4, borderRadius: size, backgroundColor: '#2D3047' }]}>
          <Ionicons name="lock-closed" size={size * 0.2} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  );
});

/** An avatar with up to 3 badges pinned along its lower edge. */
export function AvatarWithBadges({ avatar, seed, size, badges }: { avatar: string; seed: string; size: number; badges: Badge[] }) {
  const pin = Math.round(size * 0.36);
  // Spread along the bottom arc of the avatar: left, middle (lower), right.
  const spots = badges.length === 1 ? [0] : badges.length === 2 ? [-0.55, 0.55] : [-0.95, 0, 0.95];
  return (
    <View style={{ width: size, height: size + (badges.length ? pin * 0.35 : 0) }}>
      <Avatar avatar={avatar} seed={seed} size={size} />
      {badges.slice(0, 3).map((b, i) => {
        const a = spots[i] * 0.75;
        const r = size / 2;
        const x = r + Math.sin(a) * r - pin / 2;
        const y = r + Math.cos(a) * r - pin / 2 + pin * 0.1;
        return (
          <View key={b.id} style={[styles.pin, { left: x, top: y, borderRadius: pin }]} accessibilityLabel={b.label}>
            <BadgeIcon badge={b} size={pin} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { flex: 1 },
  disc: { flex: 1, backgroundColor: '#1B1E26', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shine: { position: 'absolute', borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)', transform: [{ rotate: '-30deg' }] },
  cross: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: { position: 'absolute', borderWidth: 2, borderColor: colors.background, backgroundColor: colors.background },
});
