import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clickable } from '../components/Clickable';
import { RegionSheet, useRegionName } from '../components/RegionPicker';
import { Button, Chip } from '../components/ui';
import { BROC_APP_STORE_URL } from '../constants/legal';
import { colors, radius, spacing, type CardSize } from '../constants/theme';
import { LANGUAGE_NAMES, LANGUAGES } from '../lib/i18n';
import { useRegion, useT } from '../lib/i18n/useT';
import { useResponsive } from '../lib/layout';
import * as Notifications from 'expo-notifications';
import { syncPushToken } from '../lib/push';
import { setDailyReminder } from '../lib/reminders';
import { replayListSteps } from '../lib/milestoneEvents';
import { deleteMyProfile, friendCode, socialError } from '../lib/social';
import { SHARE_HOST } from '../lib/share';
import { useTierStore } from '../store/useTierStore';


// Text keys: the labels are read in the language of the moment.
const SIZES: { key: CardSize; labelKey: string }[] = [
  { key: 'small', labelKey: 'app.settings.small' },
  { key: 'medium', labelKey: 'app.settings.medium' },
  { key: 'large', labelKey: 'app.settings.large' },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const settings = useTierStore((s) => s.settings);
  const { t, language, upper } = useT();
  const region = useRegion();
  const regionName = useRegionName();
  const [regionOpen, setRegionOpen] = useState(false);
  const count = useTierStore((s) => Object.keys(s.lists).length);
  const profile = useTierStore((s) => s.profile);
  const { updateSettings, clearAll } = useTierStore.getState();

  const replaySteps = () =>
    Alert.alert(t('app.settings.replayTitle'), t('app.settings.replayBody'), [
      { text: t('app.cancel'), style: 'cancel' },
      { text: t('app.settings.replay'), onPress: () => useTierStore.setState(replayListSteps(useTierStore.getState())) },
    ]);

  const confirmClear = () =>
    Alert.alert(t('app.settings.clearTitle'), t('app.settings.clearBody'), [
      { text: t('app.cancel'), style: 'cancel' },
      { text: t('app.settings.clear'), style: 'destructive', onPress: clearAll },
    ]);

  const confirmDeleteProfile = () =>
    Alert.alert(
      t('app.settings.deleteProfileTitle'),
      t('app.settings.deleteProfileBody', { who: profile ? friendCode(profile) : t('app.settings.yourProfile') }),
      [
        { text: t('app.cancel'), style: 'cancel' },
        {
          text: t('app.settings.delete'),
          style: 'destructive',
          onPress: () =>
            deleteMyProfile().then(
              () => Alert.alert(t('app.settings.profileDeletedTitle'), t('app.settings.profileDeletedBody')),
              (e) => Alert.alert(t('app.oops'), socialError(e)),
            ),
        },
      ],
    );

  return (
    <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{upper(t('settings.languageRegion'))}</Text>
        <Text style={styles.rowLabel}>{t('settings.language')}</Text>
        <View style={styles.chips}>
          <Chip label={t('settings.languageAuto')} selected={settings.language === 'auto'} onPress={() => updateSettings({ language: 'auto' })} />
          {LANGUAGES.map((l) => (
            <Chip key={l} label={LANGUAGE_NAMES[l]} selected={settings.language === l} onPress={() => updateSettings({ language: l })} />
          ))}
        </View>
        {settings.language === 'auto' ? (
          <Text style={styles.rowHint}>{t('settings.languageAutoHint', { language: LANGUAGE_NAMES[language] })}</Text>
        ) : null}
        <Clickable accessibilityRole="button" onPress={() => setRegionOpen(true)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
          <Row label={t('settings.region')} hint={t('settings.regionHint')}>
            <Text style={styles.regionValue}>{regionName(region)}</Text>
          </Row>
        </Clickable>
        <RegionSheet visible={regionOpen} onClose={() => setRegionOpen(false)} />
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{upper(t('app.settings.editor'))}</Text>
        <Row label={t('app.settings.haptics')} hint={t('app.settings.hapticsHint')}>
          <Switch
            value={settings.haptics}
            onValueChange={(haptics) => updateSettings({ haptics })}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <Row label={t('app.settings.sounds')} hint={t('app.settings.soundsHint')}>
          <Switch
            value={settings.sounds}
            onValueChange={(sounds) => updateSettings({ sounds })}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <Row label={t('app.settings.cardLabels')}>
          <Switch
            value={settings.showCardLabels}
            onValueChange={(showCardLabels) => updateSettings({ showCardLabels })}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <View style={styles.block}>
          <Text style={styles.rowLabel}>{t('app.settings.cardSize')}</Text>
          <View style={styles.chips}>
            {SIZES.map((s) => (
              <Chip key={s.key} label={t(s.labelKey)} selected={settings.cardSize === s.key} onPress={() => updateSettings({ cardSize: s.key })} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{upper(t('app.dailyList'))}</Text>
        <Row label={t('app.settings.reminder')} hint={t('app.settings.reminderHint')}>
          <Switch
            value={settings.dailyReminder}
            onValueChange={async (on) => {
              const ok = await setDailyReminder(on);
              if (!ok) {
                Alert.alert(t('app.settings.notificationsOffTitle'), t('app.settings.notificationsOffIphone'));
                return;
              }
              updateSettings({ dailyReminder: on, reminderAsked: true });
            }}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
      </View>

      {profile ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{upper(t('app.friends'))}</Text>
          <Row label={t('app.settings.friendNotifications')} hint={t('app.settings.friendNotificationsHint')}>
            <Switch
              value={settings.friendNotifications}
              onValueChange={async (on) => {
                updateSettings({ friendNotifications: on });
                if (on && !(await Notifications.getPermissionsAsync()).granted && !(await Notifications.requestPermissionsAsync()).granted) {
                  Alert.alert(t('app.settings.notificationsOffTitle'), t('app.settings.notificationsOffPhone'));
                }
                syncPushToken();
              }}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </Row>
        </View>
      ) : null}

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{upper(t('app.settings.about'))}</Text>
        <Button variant="secondary" icon="play-circle-outline" label={t('app.settings.replayWelcome')} onPress={() => router.push('/welcome')} />
        <Button
          variant="secondary"
          icon="shield-checkmark-outline"
          label={t('app.settings.privacy')}
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'confidentialite' } })}
        />
        <Button
          variant="secondary"
          icon="document-text-outline"
          label={t('app.settings.legal')}
          onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'mentions' } })}
        />
        <Button variant="secondary" icon="help-circle-outline" label={t('app.settings.support')} onPress={() => Linking.openURL(`https://${SHARE_HOST}/support`)} />
        <Row label={t('app.settings.version')}>
          {/* Hidden test tool: a long press replays the steps of the lists path. */}
          <Clickable onLongPress={replaySteps} delayLongPress={800} hitSlop={8}>
            <Text style={styles.rowHint}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </Clickable>
        </Row>
      </View>

      {/* A discreet word about the publisher's other app. */}
      <Clickable
        accessibilityRole="link"
        accessibilityLabel={t('app.settings.promoLabel')}
        onPress={() => Linking.openURL(BROC_APP_STORE_URL)}
        style={({ pressed }) => [styles.promo, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.promoEmoji}>🏺</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowHint}>{t('app.settings.promoKicker')}</Text>
          <Text style={styles.rowLabel}>{t('app.settings.promoName')}</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={colors.textMuted} />
      </Clickable>

      <View style={[styles.group, styles.danger]}>
        <Text style={[styles.groupTitle, { color: colors.danger }]}>{upper(t('app.settings.danger'))}</Text>
        <Text style={styles.rowHint}>
          {t('app.settings.stored', { count })}
        </Text>
        <Button label={t('app.settings.clearAll')} icon="trash-outline" variant="danger" onPress={confirmClear} disabled={count === 0} />
        {profile ? (
          <>
            <Text style={styles.rowHint}>
              {t('app.settings.profileOnline', { code: friendCode(profile) })}
            </Text>
            <Button label={t('app.settings.deleteProfile')} icon="person-remove-outline" variant="danger" onPress={confirmDeleteProfile} />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, borderWidth: 1, borderColor: colors.border },
  // Capitals through upper(), not textTransform: Greek capitals drop their accents.
  groupTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  block: { gap: spacing.sm },
  rowLabel: { color: colors.text, fontSize: 16 },
  rowHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  regionValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  danger: { borderColor: colors.danger, backgroundColor: 'rgba(255, 92, 108, 0.1)' },
  promo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  promoEmoji: { fontSize: 28 },
});
