import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clickable } from '../components/Clickable';
import { ENERGY, EnergyAmount } from '../components/Energy';
import { PurchaseBurst } from '../components/PurchaseBurst';
import { ShareSheet } from '../components/ShareSheet';
import { Button, Sheet, type IconName } from '../components/ui';
import { useBoltShow } from '../components/useBoltShow';
import { colors, radius, spacing } from '../constants/theme';
import { openWallet, useCredits } from '../lib/credits';
import { useT } from '../lib/i18n/useT';
import { useResponsive } from '../lib/layout';
import {
  collectPot,
  inviteCandidates,
  REFERRAL_CAP,
  REFERRAL_REWARD,
  referralName,
  referralStep,
  refreshReferrals,
  useReferrals,
} from '../lib/referrals';
import { adsSupported, nextAdText, refreshAdStatus, useRewardedAd, watchAd } from '../lib/rewardedAd';
import type { TierList } from '../store/types';
import { useTierStore } from '../store/useTierStore';

const GREEN = '#7BE495';

/** Energy without paying: a rewarded ad once a week (iOS), and referrals. */
export default function FreeEnergy() {
  const insets = useSafeAreaInsets();
  const { column, gutter } = useResponsive();
  const { t, locale } = useT();
  const balance = useCredits((s) => s.balance);
  const { status, offline, collecting, collectFailed, celebration } = useReferrals();
  const ad = useRewardedAd();
  const showAd = useMemo(() => adsSupported(), []);
  useEffect(() => {
    openWallet();
    refreshReferrals();
    refreshAdStatus();
  }, []);

  // The pot collected, or the ad paid: bolts from it to the balance, as for a pack bought.
  const pot = useRef<View>(null);
  const adCard = useRef<View>(null);
  const { root, counter, burst, shown, pulseStyle } = useBoltShow(
    celebration ?? ad.celebration,
    () => (celebration ? pot.current : adCard.current),
    () => (celebration ? useReferrals.setState({ celebration: null }) : useRewardedAd.setState({ celebration: null })),
  );
  const show = celebration ?? ad.celebration;
  // Unknown (offline at opening): the tap asks the server anyway.
  const adAvailable = ad.status?.available ?? true;
  const adBusy = ad.phase !== 'idle';
  const adNotice = ad.notice === 'pending' ? t('app.free.adPending') : ad.notice === 'consent' ? t('app.free.adConsent') : ad.notice === 'failed' ? t('app.free.adFailed') : null;

  const lists = useTierStore((s) => s.lists);
  const candidates = useMemo(() => inviteCandidates(lists), [lists]);
  const [picking, setPicking] = useState(false);
  const [shareFor, setShareFor] = useState<TierList | null>(null);
  const invite = () => {
    // Nothing of their own to share yet: a public list ranked is the quickest one.
    if (candidates.length === 0) router.push('/popular');
    else setPicking(true);
  };

  const pending = status?.pending ?? 0;
  const steps: { icon: IconName; text: string }[] = [
    { icon: 'share-social', text: t('app.free.step1') },
    { icon: 'person-add', text: t('app.free.step2', { reward: REFERRAL_REWARD.challenge }) },
    { icon: 'trophy', text: t('app.free.step3', { reward: REFERRAL_REWARD.active }) },
  ];

  return (
    <View ref={root} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[column, { padding: gutter, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.balance}>
          <Text style={styles.balanceLabel}>{t('app.store.balance')}</Text>
          <Animated.View ref={counter} style={pulseStyle}>
            {/* While the bolts fly, still the old balance: the new one is counted up to. */}
            <EnergyAmount amount={shown ?? (show ? show.from : balance)} size={22} style={styles.balanceValue} />
          </Animated.View>
        </View>

        {showAd ? (
          <Clickable
            ref={adCard}
            collapsable={false}
            accessibilityRole="button"
            accessibilityState={{ disabled: !adAvailable || adBusy, busy: adBusy }}
            disabled={!adAvailable || adBusy}
            onPress={() => watchAd()}
            style={({ pressed }) => [styles.card, styles.adOn, adAvailable && styles.adReady, pressed && { opacity: 0.8 }]}
          >
            <View style={[styles.round, { backgroundColor: adAvailable ? ENERGY : colors.surfaceAlt }]}>
              {adBusy ? (
                <ActivityIndicator color="#2A1B00" />
              ) : (
                <Ionicons name={adAvailable ? 'play' : 'time-outline'} size={22} color={adAvailable ? '#2A1B00' : colors.textMuted} />
              )}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.cardTitle}>{t('app.free.adTitle')}</Text>
              <Text style={styles.muted}>
                {!adAvailable && ad.status?.nextAt ? nextAdText(ad.status.nextAt, t, locale) : t('app.free.adBody')}
              </Text>
            </View>
          </Clickable>
        ) : (
          // Web and Android: no ad there, the place is kept, said to come.
          <View style={[styles.card, styles.ad]} accessible accessibilityState={{ disabled: true }}>
            <View style={[styles.round, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="play" size={22} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.adHead}>
                <Text style={styles.cardTitle}>{t('app.free.adTitle')}</Text>
                <View style={styles.soon}>
                  <Text style={styles.soonText}>{t('app.free.soon')}</Text>
                </View>
              </View>
              <Text style={styles.muted}>{t('app.free.adBody')}</Text>
            </View>
          </View>
        )}
        {adNotice ? (
          <View style={styles.message} accessibilityLiveRegion="polite">
            <Text style={styles.messageText}>{adNotice}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { gap: spacing.md }]}>
          <Text style={styles.cardTitle}>{t('app.free.referTitle')}</Text>
          {steps.map((step, i) => (
            <View key={step.icon} style={styles.step}>
              <View style={[styles.round, { backgroundColor: 'rgba(124, 92, 255, 0.18)' }]}>
                <Ionicons name={step.icon} size={20} color="#B6A4FF" />
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
          <Text style={styles.muted}>{t('app.free.newOnly')}</Text>
        </View>

        {status === null && offline ? (
          <View style={styles.message} accessibilityLiveRegion="polite">
            <Text style={styles.messageText}>{t('app.free.offline')}</Text>
          </View>
        ) : status === null ? (
          <ActivityIndicator color={colors.textMuted} />
        ) : (
          <>
            <View ref={pot} collapsable={false} style={[styles.card, styles.pot, pending > 0 && styles.potFull]}>
              <Text style={[styles.potText, pending > 0 && { color: ENERGY }]}>{t('app.free.pending', { pending })}</Text>
              <Clickable
                accessibilityRole="button"
                accessibilityState={{ disabled: pending <= 0, busy: collecting }}
                disabled={pending <= 0 || collecting}
                onPress={() => collectPot()}
                style={({ pressed }) => [styles.collect, pending <= 0 && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
              >
                {collecting ? <ActivityIndicator color="#2A1B00" /> : <Text style={styles.collectText}>{t('app.free.collect')}</Text>}
              </Clickable>
            </View>
            {collectFailed ? (
              <View style={styles.message} accessibilityLiveRegion="polite">
                <Text style={styles.messageText}>{t('app.free.collectFailed')}</Text>
              </View>
            ) : null}

            <View style={{ gap: spacing.sm }}>
              <Text style={styles.count}>{t('app.free.count', { count: status.count, cap: status.cap || REFERRAL_CAP })}</Text>
              {status.referrals.length === 0 ? (
                <Text style={styles.muted}>{t('app.free.none')}</Text>
              ) : (
                status.referrals.map((r, i) => (
                  <View key={`${r.since}-${i}`} style={styles.referral}>
                    <Ionicons name={r.active ? 'checkmark-circle' : 'person-circle'} size={30} color={r.active ? GREEN : colors.textMuted} />
                    {/* Two lines: side by side, a long pseudo and the Greek step cut each other off. */}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1} style={styles.referralName}>
                        {referralName(r, t)}
                      </Text>
                      <Text numberOfLines={1} style={[styles.referralStep, r.active && { color: GREEN }]}>
                        {referralStep(r, t)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <Button icon="person-add" label={t('app.free.invite')} onPress={invite} />
        {candidates.length === 0 ? <Text style={[styles.muted, { textAlign: 'center' }]}>{t('app.free.noList')}</Text> : null}
      </ScrollView>
      {burst ? <PurchaseBurst key={burst.key} from={burst.from} to={burst.to} /> : null}

      <Sheet visible={picking} onClose={() => setPicking(false)} title={t('app.free.pickList')}>
        <View style={{ gap: spacing.sm }}>
          {candidates.map((list) => (
            <Clickable
              key={list.id}
              accessibilityRole="button"
              onPress={() => {
                setPicking(false);
                // iOS cannot present the share sheet while this one animates out.
                setTimeout(() => setShareFor(list), 350);
              }}
              style={({ pressed }) => [styles.pick, pressed && { opacity: 0.7 }]}
            >
              {list.emoji ? <Text style={styles.pickEmoji}>{list.emoji}</Text> : <Ionicons name="list" size={20} color={colors.textMuted} />}
              <Text numberOfLines={1} style={styles.pickTitle}>
                {list.title}
              </Text>
              <Ionicons name="share-outline" size={20} color={colors.textMuted} />
            </Clickable>
          ))}
        </View>
      </Sheet>
      <ShareSheet list={shareFor ? (lists[shareFor.id] ?? null) : null} visible={shareFor !== null} onClose={() => setShareFor(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  balance: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  balanceLabel: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  balanceValue: { color: ENERGY, fontSize: 24 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  ad: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: 0.7 },
  adOn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  adReady: { borderColor: ENERGY, backgroundColor: 'rgba(255, 216, 74, 0.08)' },
  adHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  soon: { backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  soonText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNumber: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  stepNumberText: { color: colors.primaryText, fontSize: 11, fontWeight: '800' },
  stepText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 21 },
  message: { backgroundColor: 'rgba(255, 216, 74, 0.12)', borderColor: 'rgba(255, 216, 74, 0.5)', borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  messageText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  pot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  potFull: { borderColor: ENERGY, backgroundColor: 'rgba(255, 216, 74, 0.08)' },
  potText: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  collect: { minWidth: 110, height: 44, borderRadius: 22, backgroundColor: ENERGY, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  collectText: { color: '#2A1B00', fontSize: 16, fontWeight: '800' },
  count: { color: colors.text, fontSize: 16, fontWeight: '700' },
  referral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  referralName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  referralStep: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  pick: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md },
  pickEmoji: { fontSize: 20 },
  pickTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
});
