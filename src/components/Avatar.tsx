import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { avatarSvg, decodeAvatar, isAvatarCode, type AvatarConfig } from '../lib/avatar';
import { avatarColor } from '../lib/social';

/** An avatar drawn from its settings (used by the avatar editor for live previews). */
export const AvatarDrawing = memo(function AvatarDrawing({ config, size }: { config: AvatarConfig; size: number }) {
  const xml = useMemo(() => {
    // Ids unique to the look: on the web every avatar's gradient lives in the same page.
    const uid = Object.values(config).join('');
    return avatarSvg(config, uid);
  }, [config]);
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
