import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { badgeById, badgeLabel, FORKS, placeBadge, type Badge } from '../../lib/badges';
import { useT } from '../../lib/i18n/useT';
import { useTierStore } from '../../store/useTierStore';
import { BadgeIcon } from '../BadgeIcon';
import { Clickable } from '../Clickable';

type Props = {
  /** The badges pinned on the avatar, in slot order. */
  value: string[];
  onChange: (ids: string[]) => void;
};

/**
 * The 3 badge slots of the profile. A tap on a slot opens, just below, the badges
 * won on the path; one already pinned elsewhere swaps places.
 */
export function BadgeSlots({ value, onChange }: Props) {
  const { t, upper } = useT();
  const choices = useTierStore((s) => s.badgeChoices);
  const [open, setOpen] = useState<number | null>(null);

  const won = FORKS.map((f) => (choices[f.id] ? badgeById(choices[f.id]) : undefined)).filter((b): b is Badge => b !== undefined);
  const slots = [0, 1, 2].map((i) => (value[i] ? badgeById(value[i]) : undefined));

  const put = (slot: number, id: string | null) => {
    onChange(placeBadge(value, slot, id));
    setOpen(null);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.label}>{upper(t('play.badges.mine'))}</Text>
      <View style={styles.row}>
        {slots.map((b, i) => {
          const selected = open === i;
          return (
            <Clickable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={b ? t('play.badges.slotA11y', { n: i + 1, name: badgeLabel(b) }) : t('play.badges.slotEmptyA11y', { n: i + 1 })}
              accessibilityState={{ expanded: selected, disabled: won.length === 0 }}
              disabled={won.length === 0}
              onPress={() => setOpen(selected ? null : i)}
              style={({ pressed }) => [styles.slot, selected && styles.slotOn, pressed && { opacity: 0.85 }]}
            >
              {b ? (
                <BadgeIcon badge={b} size={52} />
              ) : (
                <View style={styles.empty}>
                  <Ionicons name={won.length ? 'add' : 'lock-closed'} size={won.length ? 24 : 18} color={colors.textMuted} />
                </View>
              )}
              <Text numberOfLines={1} style={[styles.slotLabel, !b && { color: colors.textMuted }]}>
                {b ? badgeLabel(b) : won.length ? t('play.badges.free') : t('play.badges.locked')}
              </Text>
            </Clickable>
          );
        })}
      </View>
      {won.length === 0 ? (
        <Text style={styles.hint}>{t('play.badges.firstOnPath', { at: FORKS[0].at })}</Text>
      ) : open === null ? (
        <Text style={styles.hint}>{t('play.badges.tapSlot')}</Text>
      ) : (
        <View style={styles.picker}>
          {won.map((b) => {
            const here = value[open] === b.id;
            const elsewhere = !here && value.includes(b.id);
            return (
              <Clickable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={elsewhere ? t('play.badges.swapA11y', { name: badgeLabel(b) }) : badgeLabel(b)}
                accessibilityState={{ selected: here }}
                onPress={() => put(open, b.id)}
                style={({ pressed }) => [styles.choice, here && styles.choiceOn, pressed && { opacity: 0.8 }]}
              >
                <View style={{ opacity: elsewhere ? 0.45 : 1 }}>
                  <BadgeIcon badge={b} size={44} />
                </View>
                <Text numberOfLines={1} style={styles.choiceLabel}>
                  {badgeLabel(b)}
                </Text>
              </Clickable>
            );
          })}
          {value[open] ? (
            <Clickable
              accessibilityRole="button"
              accessibilityLabel={t('play.badges.removeA11y')}
              onPress={() => put(open, null)}
              style={({ pressed }) => [styles.choice, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.empty, { width: 44, height: 44, borderRadius: 22 }]}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </View>
              <Text numberOfLines={1} style={[styles.choiceLabel, { color: colors.textMuted }]}>
                {t('play.badges.remove')}
              </Text>
            </Clickable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: spacing.sm },
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  slotOn: { borderColor: colors.primary, backgroundColor: 'rgba(124, 92, 255, 0.14)' },
  slotLabel: { color: colors.text, fontSize: 12, fontWeight: '700', maxWidth: '100%' },
  empty: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  picker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  choice: { width: 76, alignItems: 'center', gap: 2, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 2, borderColor: 'transparent' },
  choiceOn: { borderColor: colors.primary },
  choiceLabel: { color: colors.text, fontSize: 11, fontWeight: '700', maxWidth: '100%' },
});
