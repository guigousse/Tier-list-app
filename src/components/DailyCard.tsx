import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, TIER_COLORS } from '../constants/theme';
import { today } from '../lib/api';
import { formatDay } from '../lib/format';
import { useCatalog } from '../store/useCatalog';
import { useTierStore } from '../store/useTierStore';

/** "5 h 12" until local midnight, when the next daily tier list comes out. */
function untilMidnight(): string {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const min = Math.max(1, Math.round((midnight.getTime() - now.getTime()) / 60000));
  return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}` : `${min} min`;
}

/** Leading emoji of each item, for the preview chips. */
function emojiOf(label: string): string | undefined {
  return label.match(/^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/u)?.[0];
}

/** Home screen hero for the daily tier list published online. */
export function DailyCard() {
  const daily = useCatalog((s) => s.daily);
  const existing = useTierStore((s) => (daily ? Object.values(s.lists).find((l) => l.daily?.day === daily.day) : undefined));

  if (!daily) return null;
  const isToday = daily.day === today();
  const validated = Boolean(existing?.daily?.validatedAt);
  const total = daily.items.length;
  const ranked = existing ? total - existing.pool.length : 0;

  const open = () => {
    if (existing && validated) {
      router.push({ pathname: '/results/[id]', params: { id: existing.id } });
      return;
    }
    const id = existing?.id ?? useTierStore.getState().createDailyList(daily);
    router.push({ pathname: '/editor/[id]', params: { id } });
  };

  const status = validated ? 'Classement validé' : existing ? `En cours · ${ranked}/${total} classées` : `${total} cartes à classer`;
  const cta = validated ? 'Voir le classement moyen' : existing ? 'Reprendre mon classement' : 'Classer maintenant';
  const chips = daily.items.map(emojiOf).filter(Boolean).slice(0, 6) as string[];

  return (
    <Pressable accessibilityRole="button" accessibilityHint={cta} onPress={open} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      {/* S→D colour edge, echoing the classic format of the daily list. */}
      <View style={styles.edge} pointerEvents="none">
        {TIER_COLORS.slice(0, 5).map((c) => (
          <View key={c} style={[styles.edgeSegment, { backgroundColor: c }]} />
        ))}
      </View>

      <View style={styles.top}>
        <View style={styles.badge}>
          <Ionicons name="calendar" size={12} color="#1A1428" />
          <Text style={styles.badgeText}>{isToday ? 'Tier list du jour' : 'Dernière tier list du jour'}</Text>
        </View>
        <Text style={styles.date}>{formatDay(daily.day)}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>{daily.emoji}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text numberOfLines={2} style={styles.title}>
            {daily.title}
          </Text>
          {daily.description ? (
            <Text numberOfLines={2} style={styles.description}>
              {daily.description}
            </Text>
          ) : null}
        </View>
      </View>

      {chips.length ? (
        <View style={styles.chips}>
          {chips.map((e, i) => (
            <View key={i} style={styles.chip}>
              <Text style={styles.chipText}>{e}</Text>
            </View>
          ))}
          {total > chips.length ? <Text style={styles.more}>+{total - chips.length}</Text> : null}
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.statusRow}>
          {validated ? <Ionicons name="checkmark-circle" size={14} color="#BFFF7F" /> : null}
          <Text numberOfLines={1} style={styles.status}>
            {status}
          </Text>
          {isToday ? (
            <View style={styles.next} accessible accessibilityLabel={`Prochaine tier list dans ${untilMidnight()}`}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text numberOfLines={1} style={styles.nextText}>
                {untilMidnight()}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cta}>
          <Text numberOfLines={1} style={styles.ctaLabel}>
            {cta}
          </Text>
          <Ionicons name={validated ? 'people' : 'arrow-forward'} size={16} color="#1A1428" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: '#24175A',
    padding: spacing.lg,
    paddingTop: spacing.lg + 4,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.6)',
  },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', height: 4 },
  edgeSegment: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFDF7F', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#1A1428', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  date: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emojiWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  emoji: { fontSize: 36 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  description: { color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 19 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chip: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,17,21,0.45)' },
  chipText: { fontSize: 18 },
  more: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', marginLeft: 2 },
  footer: { gap: spacing.sm, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', flexShrink: 1 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto', paddingLeft: spacing.sm },
  nextText: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ctaLabel: { color: '#1A1428', fontSize: 15, fontWeight: '800', flexShrink: 1 },
});
