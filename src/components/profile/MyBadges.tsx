import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { badgeById, FORKS, knownBadges, showBadges, type Badge } from '../../lib/badges';
import { useTierStore } from '../../store/useTierStore';
import { BadgeIcon } from '../BadgeIcon';
import { Clickable } from '../Clickable';
import { Button, Sheet } from '../ui';

/** The 3 badges shown on the profile, and the sheet to pick them among the badges won. */
export function MyBadges() {
  const choices = useTierStore((s) => s.badgeChoices);
  const shown = useTierStore((s) => s.shownBadges);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  const won = FORKS.map((f) => (choices[f.id] ? badgeById(choices[f.id]) : undefined)).filter((b): b is Badge => b !== undefined);
  const visible = knownBadges(shown);
  const first = FORKS[0];

  const edit = () => {
    setDraft(shown);
    setEditing(true);
  };
  const toggle = (id: string) => setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : d.length < 3 ? [...d, id] : [...d.slice(1), id]));

  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={won.length ? 'Mes badges : choisir ceux de mon profil' : 'Mes badges'}
      disabled={won.length === 0}
      onPress={edit}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>Mes badges</Text>
        <Text numberOfLines={2} style={styles.hint}>
          {won.length === 0 ? `Premier badge au palier ${first.at}` : 'Épinglés sur votre avatar'}
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
      {won.length > 0 ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
      <Sheet visible={editing} onClose={() => setEditing(false)} title="Badges affichés">
        <View style={{ gap: spacing.md }}>
          <Text style={styles.hint}>Choisissez jusqu’à 3 badges à épingler sur votre avatar.</Text>
          <View style={styles.grid}>
            {won.map((b) => {
              const on = draft.includes(b.id);
              return (
                <Clickable
                  key={b.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(b.id)}
                  style={[styles.choice, on && styles.choiceOn]}
                >
                  <BadgeIcon badge={b} size={56} />
                  <Text numberOfLines={2} style={styles.slotLabel}>
                    {b.label}
                  </Text>
                </Clickable>
              );
            })}
          </View>
          <Button
            label="Enregistrer"
            icon="checkmark"
            onPress={() => {
              showBadges(draft);
              setEditing(false);
            }}
          />
        </View>
      </Sheet>
    </Clickable>
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
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  slots: { flexDirection: 'row', gap: 4 },
  slot: { width: 96, alignItems: 'center', gap: 4 },
  slotLabel: { color: colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { width: 100, alignItems: 'center', gap: 4, padding: spacing.sm, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent' },
  choiceOn: { borderColor: colors.primary, backgroundColor: 'rgba(124, 92, 255, 0.14)' },
});
