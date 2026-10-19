import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { badgeLabel, FORKS, knownBadges } from '../../lib/badges';
import { useT } from '../../lib/i18n/useT';
import { useTierStore } from '../../store/useTierStore';
import { BadgeIcon } from '../BadgeIcon';

/** The 3 badges shown on the profile; they are chosen in « Mon profil », next to the pseudo. */
export function MyBadges() {
  const { t } = useT();
  const choices = useTierStore((s) => s.badgeChoices);
  const shown = useTierStore((s) => s.shownBadges);

  const won = FORKS.filter((f) => choices[f.id]).length;
  const visible = knownBadges(shown);
  const first = FORKS[0];

  return (
    <View style={styles.card} accessible accessibilityLabel={t('play.badges.mineA11y', { list: visible.length ? visible.map(badgeLabel).join(', ') : t('play.badges.none') })}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>{t('play.badges.mine')}</Text>
        <Text numberOfLines={2} style={styles.hint}>
          {won === 0 ? t('play.badges.first', { at: first.at }) : t('play.badges.changeIn')}
        </Text>
      </View>
      <View style={styles.slots}>
        {[0, 1, 2].map((i) =>
          visible[i] ? (
            <BadgeIcon key={i} badge={visible[i]} size={40} />
          ) : (
            <View key={i} style={styles.empty}>
              <Text style={styles.emptyText}>?</Text>
            </View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  slots: { flexDirection: 'row', gap: 4 },
  empty: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: colors.textMuted, fontSize: 20, fontWeight: '800' },
});
