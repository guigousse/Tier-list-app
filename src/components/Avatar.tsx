import { memo, useId, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { avatarBackground, avatarSvg, decodeAvatar, isAvatarCode, type AvatarConfig, type AvatarZoom } from '../lib/avatar';
import { avatarColor } from '../lib/social';
import { AvatarBackdrop } from './AvatarBackdrop';

/** From this size up, premium backgrounds move (smaller: lists, where many avatars show). */
const ANIMATED_FROM = 56;

/**
 * An avatar drawn from its settings (used by the avatar editor for live previews), or a
 * close-up of it. `focus`: all grey but that part, for rewards shown on the mannequin.
 * A premium background is drawn alive under the character, still below ANIMATED_FROM.
 */
export const AvatarDrawing = memo(function AvatarDrawing({
  config,
  size,
  zoom,
  focus,
}: {
  config: AvatarConfig;
  size: number;
  zoom?: AvatarZoom;
  focus?: keyof AvatarConfig;
}) {
  // Gradient ids unique to this drawing: on the web, every avatar of every screen
  // (hidden ones included) lives in the same page.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bg = avatarBackground(config);
  // Close-ups and greyed backgrounds stay still, in the drawing itself.
  const alive = !!bg.fx && !zoom && (!focus || focus === 'bg');
  const xml = useMemo(() => avatarSvg(config, uid, zoom, focus, !alive), [config, uid, zoom, focus, alive]);
  if (!alive) return <SvgXml xml={xml} width={size} height={size} />;
  return (
    <View style={{ width: size, height: size }}>
      <AvatarBackdrop bg={bg} size={size} animated={size >= ANIMATED_FROM} />
      {/* Positioned too, so it stays over the background on the web. */}
      <View style={StyleSheet.absoluteFill}>
        <SvgXml xml={xml} width={size} height={size} />
      </View>
    </View>
  );
});

/**
 * A player's avatar: drawn from its code, or, for profiles made before drawn
 * avatars (and hidden profiles), their emoji on a colour of their own.
 */
export const Avatar = memo(function Avatar({ avatar, seed, size = 44 }: { avatar: string; seed: string; size?: number }) {
  const config = useMemo(() => (isAvatarCode(avatar) ? decodeAvatar(avatar) : null), [avatar]);
  if (config) return <AvatarDrawing config={config} size={size} />;
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(seed) }]}>
      <Text style={{ fontSize: size * 0.55 }}>{avatar}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
