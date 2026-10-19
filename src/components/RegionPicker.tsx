import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';
import { flag, REGIONS } from '../lib/i18n/regions';
import { nextRegionChange, REGION_CHANGE_DAYS } from '../lib/regionChange';
import { deviceRegion, useRegion, useT } from '../lib/i18n/useT';
import { useTierStore } from '../store/useTierStore';
import { Clickable } from './Clickable';
import { Button, Sheet } from './ui';

/** A region's flag and name in the app's language; null is worldwide. */
function regionDisplayName(region: string, locale: string): string | undefined {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(region);
  } catch {
    return undefined;
  }
}

export function useRegionName() {
  const { t, locale } = useT();
  return (region: string | null) => {
    if (!region) return `🌍 ${t('region.world')}`;
    const key = `region.${region}`;
    const named = t(key);
    // A country outside the pickable ones (a list kept to it): the system names it.
    return `${flag(region)} ${named !== key ? named : (regionDisplayName(region, locale) ?? region)}`;
  };
}

/** The regions to pick from: the phone's first, then the others, then worldwide. */
function RegionList({ value, onPick }: { value: string | null; onPick: (region: string | null) => void }) {
  const name = useRegionName();
  const phone = deviceRegion();
  const order: (string | null)[] = [...(phone ? [phone] : []), ...REGIONS.filter((r) => r !== phone), null];
  return (
    <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.xs }}>
      {order.map((r) => (
        <Clickable
          key={r ?? 'world'}
          accessibilityRole="radio"
          accessibilityState={{ selected: r === value }}
          onPress={() => onPick(r)}
          style={({ pressed }) => [styles.option, r === value && styles.optionOn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.optionText}>{name(r)}</Text>
          {r === value ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
        </Clickable>
      ))}
    </ScrollView>
  );
}

/**
 * Picking the region from the settings: once a month, after a warning to confirm. While
 * the month runs, the sheet says when the next change is possible.
 */
export function RegionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, locale } = useT();
  const region = useRegion();
  const name = useRegionName();
  const changedAt = useTierStore((s) => s.settings.regionChangedAt);
  // The region picked, waiting for the warning to be confirmed.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const close = () => {
    setPicked(undefined);
    onClose();
  };
  // Read once when the settings open: the lock counts in days, not seconds.
  const [now] = useState(Date.now);
  const next = nextRegionChange(changedAt, now);
  if (next !== null) {
    const date = new Date(next).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
    return (
      <Sheet visible={visible} onClose={close} title={t('region.title')}>
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.current}>{name(region)}</Text>
          <Text style={styles.text}>{t('region.locked', { date })}</Text>
        </View>
      </Sheet>
    );
  }
  if (picked !== undefined) {
    return (
      <Sheet
        visible={visible}
        onClose={close}
        title={t('region.title')}
        footer={
          <View style={styles.buttons}>
            <Button variant="secondary" label={t('app.cancel')} onPress={() => setPicked(undefined)} style={{ flex: 1 }} />
            <Button
              icon="checkmark"
              label={t('region.confirm')}
              onPress={() => {
                useTierStore.getState().changeRegion(picked);
                close();
              }}
              style={{ flex: 1 }}
            />
          </View>
        }
      >
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.current}>{name(picked)}</Text>
          <Text style={styles.text}>{t('region.warning', { days: REGION_CHANGE_DAYS })}</Text>
        </View>
      </Sheet>
    );
  }
  return (
    <Sheet visible={visible} onClose={close} title={t('region.pick')}>
      <RegionList value={region} onPick={(r) => (r === region ? close() : setPicked(r))} />
    </Sheet>
  );
}

/**
 * Asked once after the welcome screens: the phone's region, ready to confirm, or another.
 * Closing keeps the phone's region.
 */
export function RegionQuestion() {
  const { t } = useT();
  // After the statistics question: one sheet at a time.
  const ask = useTierStore((s) => s.settings.onboarded && !s.settings.regionAsked && s.settings.analyticsConsent !== 'unknown');
  const region = useRegion();
  const name = useRegionName();
  const [choosing, setChoosing] = useState(false);
  const done = (patch?: { region: string }) => useTierStore.getState().updateSettings({ ...patch, regionAsked: true });
  return (
    <Sheet
      visible={ask}
      onClose={() => done()}
      title={t('region.title')}
      footer={
        choosing ? null : (
          <View style={styles.buttons}>
            <Button variant="secondary" label={t('region.change')} onPress={() => setChoosing(true)} style={{ flex: 1 }} />
            <Button icon="checkmark" label={t('region.confirm')} onPress={() => done()} style={{ flex: 1 }} />
          </View>
        )
      }
    >
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.text}>{t('region.intro')}</Text>
        {choosing ? (
          <RegionList value={region} onPick={(r) => done({ region: r ?? 'world' })} />
        ) : (
          <>
            <Text style={styles.current}>{name(region)}</Text>
            <Text style={styles.muted}>{t('region.later')}</Text>
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 380 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  optionOn: { borderWidth: 1, borderColor: colors.primary },
  optionText: { color: colors.text, fontSize: 16 },
  text: { color: colors.text, fontSize: 15, lineHeight: 21 },
  current: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', paddingVertical: spacing.sm },
  muted: { color: colors.textMuted, fontSize: 13 },
  buttons: { flexDirection: 'row', gap: spacing.sm },
});
