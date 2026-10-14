import type { NativeStackHeaderProps } from 'expo-router';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../constants/theme';
import { useResponsive } from '../lib/layout';
import { TierStrip } from './TierStrip';
import { IconButton } from './ui';

/**
 * Header of the secondary screens: back button, title and actions, then the tier
 * strip. It stays in place while the page scrolls below it.
 */
export function AppHeader({ navigation, options, back, route }: NativeStackHeaderProps) {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const modal = options.presentation === 'modal' || options.presentation === 'formSheet';
  const title = typeof options.headerTitle === 'string' ? options.headerTitle : (options.title ?? route.name);
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : router.replace('/'));

  return (
    <View style={[styles.wrap, { paddingTop: modal ? spacing.sm : insets.top }]}>
      <View style={[column, styles.inner, { paddingHorizontal: gutter }]}>
        <View style={styles.row}>
          <View style={styles.side}>
            {back || !modal ? <IconButton icon={modal ? 'close' : 'chevron-back'} label={modal ? 'Fermer' : 'Retour'} onPress={goBack} size={26} /> : null}
          </View>
          <Text numberOfLines={1} style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <View style={[styles.side, styles.right]}>{options.headerRight?.({ tintColor: colors.text, canGoBack: Boolean(back) })}</View>
        </View>
        <TierStrip />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.background },
  inner: { gap: spacing.sm, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.sm },
  side: { minWidth: 72, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end' },
  title: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
