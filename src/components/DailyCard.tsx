import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { radius, spacing } from '../constants/theme';
import { dailyStreak } from '../lib/streak';
import { useCatalog } from '../store/useCatalog';
import { useTierStore } from '../store/useTierStore';
import { Clickable } from './Clickable';

const SHINE_WIDTH = 80;

/** Home screen card for the daily tier list: coloured, with a sweeping shine. */
export function DailyCard() {
  const daily = useCatalog((s) => s.daily);
  const existing = useTierStore((s) => (daily ? Object.values(s.lists).find((l) => l.daily?.day === daily.day) : undefined));
  const lists = useTierStore((s) => s.lists);
  const streak = useMemo(() => dailyStreak(Object.values(lists)), [lists]);
  const [width, setWidth] = useState(0);

  // Shine: a light band crossing the card every few seconds.
  const shine = useSharedValue(0);
  useEffect(() => {
    shine.value = withRepeat(withSequence(withTiming(1, { duration: 1100 }), withDelay(2600, withTiming(0, { duration: 0 }))), -1);
  }, [shine]);
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -SHINE_WIDTH * 2 + shine.value * (width + SHINE_WIDTH * 3) }, { skewX: '-20deg' }],
  }));

  // Arrow nudging to the right, inviting to tap.
  const nudge = useSharedValue(0);
  useEffect(() => {
    nudge.value = withRepeat(withSequence(withTiming(4, { duration: 450 }), withSpring(0)), -1);
  }, [nudge]);
  const nudgeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));

  if (!daily) return null;
  const validated = Boolean(existing?.daily?.validatedAt);

  const open = () => {
    if (existing && validated) {
      router.push({ pathname: '/results/[id]', params: { id: existing.id } });
      return;
    }
    const id = existing?.id ?? useTierStore.getState().createDailyList(daily);
    router.push({ pathname: '/editor/[id]', params: { id } });
  };

  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={`Tier list du jour : ${daily.title}`}
      accessibilityHint={validated ? 'Voir le classement moyen' : 'Classer les cartes'}
      onPress={open}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <LinearGradient colors={['#7C5CFF', '#B45CFF', '#FF7FA8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Text style={styles.emoji}>{daily.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.kicker}>Tier list du jour{streak > 0 ? `  ·  🔥 ${streak}` : ''}</Text>
        <Text style={styles.title}>
          {daily.title}
        </Text>
      </View>
      <View style={[styles.action, validated && styles.actionDone]}>
        {validated ? (
          <Ionicons name="checkmark" size={22} color="#FFFFFF" />
        ) : (
          <Animated.View style={nudgeStyle}>
            <Ionicons name="arrow-forward" size={22} color="#5B2BE0" />
          </Animated.View>
        )}
      </View>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  shine: { position: 'absolute', top: -20, bottom: -20, left: 0, width: SHINE_WIDTH },
  emoji: { fontSize: 32 },
  kicker: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  action: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  actionDone: { backgroundColor: '#2EAD6B' },
});
