import { memo, useId, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { avatarSvg, decodeAvatar, isAvatarCode, type AvatarConfig, type AvatarZoom } from '../lib/avatar';
import { avatarColor } from '../lib/social';

/** An avatar drawn from its settings (used by the avatar editor for live previews), or a close-up of it. */
export const AvatarDrawing = memo(function AvatarDrawing({ config, size, zoom }: { config: AvatarConfig; size: number; zoom?: AvatarZoom }) {
  // Gradient ids unique to this drawing: on the web, every avatar of every screen
  // (hidden ones included) lives in the same page.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const xml = useMemo(() => avatarSvg(config, uid, zoom), [config, uid, zoom]);
  return <SvgXml xml={xml} width={size} height={size} />;
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
