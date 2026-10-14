import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { creditCost, CREDITS, generateCards, TEST_BALANCE, useAiJob } from '../../lib/aiGenerate';
import { Clickable } from '../Clickable';
import { CardIcon } from '../CardIcon';
import { Button, Field, Sheet } from '../ui';

const COUNTS = [5, 8, 10, 12, 15, 20];

/**
 * AI generation on one page: 1. theme (the list's title to start with), 2. how many
 * cards, 3. images or not, then the total cost, and "Générer" once everything is
 * filled in and the player can afford it. Then the progress of the generation.
 */
export function AiSheet({ visible, onClose, listId, title }: { visible: boolean; onClose: () => void; listId: string; title: string }) {
  const [theme, setTheme] = useState(title);
  const [count, setCount] = useState(10);
  const [images, setImages] = useState(true);
  const job = useAiJob((s) => (s.job?.listId === listId ? s.job : null));
  const running = job && job.phase !== 'done' && job.phase !== 'error';
  // Each opening starts the questions again, unless a generation is under way.
  const [showJob, setShowJob] = useState(false);

  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setShowJob(Boolean(running));
      setTheme(title);
    }
  }

  const cost = creditCost(count, images);
  const start = () => {
    setShowJob(true);
    generateCards(listId, theme.trim(), count, images);
  };

  // No credits yet: a test balance, nothing is taken.
  const balance = TEST_BALANCE;
  const affordable = cost <= balance;
  const ready = theme.trim().length > 0 && affordable;

  if (showJob && job) {
    const iconsTotal = job.cards;
    const progress = iconsTotal ? (job.icons + job.failed) / iconsTotal : 0;
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        title="Génération"
        footer={<Button label={running ? 'Continuer en arrière-plan' : 'Terminé'} onPress={onClose} />}
      >
        {job.phase === 'words' ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>L’IA imagine vos cartes…</Text>
          </View>
        ) : job.phase === 'error' ? (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.error}>{job.error}</Text>
            <Button variant="secondary" label="Modifier ma demande" icon="arrow-back" onPress={() => setShowJob(false)} />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={styles.status}>
              <Ionicons name="checkmark-circle" size={22} color="#2EAD6B" />
              <Text style={styles.statusText}>
                {job.cards} carte{job.cards > 1 ? 's' : ''} ajoutée{job.cards > 1 ? 's' : ''} à la liste
              </Text>
            </View>
            {job.images ? (
              <View style={{ gap: spacing.sm }}>
                <View style={styles.status}>
                  {job.phase === 'icons' ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="checkmark-circle" size={22} color="#2EAD6B" />}
                  <Text style={styles.statusText}>
                    Images : {job.icons} / {iconsTotal}
                    {job.failed ? ` · ${job.failed} sans image` : ''}
                  </Text>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
                </View>
                {job.phase === 'icons' ? (
                  <Text style={styles.hint}>Les images arrivent une par une : vous pouvez fermer, elles continuent d’arriver.</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Générer avec l’IA"
      footer={
        <View style={styles.footer}>
          {!affordable ? <Text style={styles.short}>Solde insuffisant : il manque {cost - balance} crédits.</Text> : null}
          <Button label={`Générer · ${cost} crédits`} icon="sparkles" disabled={!ready} onPress={start} />
        </View>
      }
    >
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionNumber}>1</Text>
          <Text style={styles.sectionTitle}>Thème de la liste</Text>
        </View>
        <Field value={theme} onChangeText={setTheme} placeholder="Ex. : Pizzas, films de Noël, métiers de rêve…" maxLength={80} returnKeyType="done" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionNumber}>2</Text>
            <Text style={styles.sectionTitle}>Nombre de cartes</Text>
          </View>
          <View style={styles.stepper}>
            <Clickable
              accessibilityRole="button"
              accessibilityLabel="Une carte de moins"
              onPress={() => setCount(Math.max(3, count - 1))}
              style={styles.stepperButton}
            >
              <Ionicons name="remove" size={20} color={colors.text} />
            </Clickable>
            <Text style={styles.count}>{count}</Text>
            <Clickable
              accessibilityRole="button"
              accessibilityLabel="Une carte de plus"
              onPress={() => setCount(Math.min(20, count + 1))}
              style={styles.stepperButton}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </Clickable>
          </View>
        </View>
        <View style={styles.chips}>
          {COUNTS.map((n) => (
            <Clickable key={n} accessibilityRole="button" onPress={() => setCount(n)} style={[styles.chip, n === count && styles.chipOn]}>
              <Text style={[styles.chipText, n === count && { color: colors.primaryText }]}>{n}</Text>
            </Clickable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionNumber}>3</Text>
          <Text style={styles.sectionTitle}>Génération d’images</Text>
        </View>
        <Clickable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: images }}
          onPress={() => setImages(!images)}
          style={[styles.check, images && styles.checkOn]}
        >
          <Ionicons name={images ? 'checkbox' : 'square-outline'} size={26} color={images ? colors.primary : colors.textMuted} />
          <Text style={[styles.checkTitle, { flex: 1 }]}>Générer les images liées aux cartes</Text>
          <CardIcon id="camera" size={40} />
        </Clickable>
      </View>

      <View style={styles.total}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionNumber}>4</Text>
          <Text style={styles.sectionTitle}>Total</Text>
        </View>
        <View style={styles.recap}>
          <Text style={styles.recapText}>
            {count} mot{count > 1 ? 's' : ''} × {CREDITS.word} crédit
          </Text>
          <Text style={styles.recapValue}>{count * CREDITS.word}</Text>
        </View>
        {images ? (
          <View style={styles.recap}>
            <Text style={styles.recapText}>
              {count} image{count > 1 ? 's' : ''} × {CREDITS.image} crédits
            </Text>
            <Text style={styles.recapValue}>{count * CREDITS.image}</Text>
          </View>
        ) : null}
        <View style={[styles.recap, styles.recapTotal]}>
          <Text style={[styles.recapText, { color: colors.text, fontWeight: '800' }]}>Coût</Text>
          <Text style={[styles.recapValue, { fontSize: 18 }, !affordable && { color: colors.danger }]}>{cost} crédits</Text>
        </View>
        <View style={styles.recap}>
          <Text style={styles.recapText}>Votre solde</Text>
          <Text style={styles.recapValue}>{balance} crédits</Text>
        </View>
        <Text style={styles.hint}>Phase de test : solde fictif, rien n’est décompté.</Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  credits: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 216, 74, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 216, 74, 0.5)',
  },
  creditsText: { color: '#FFD84A', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  section: { gap: spacing.sm, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionNumber: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  total: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  short: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  steps: { flexDirection: 'row', gap: 6 },
  stepDot: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  stepDotOn: { borderBottomColor: colors.primary },
  stepText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  question: { color: colors.text, fontSize: 18, fontWeight: '800' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepperButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  count: { color: colors.text, fontSize: 26, fontWeight: '900', minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  chip: { minWidth: 46, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center' },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkOn: { borderColor: colors.primary, backgroundColor: 'rgba(124, 92, 255, 0.1)' },
  checkTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  previews: { gap: 2 },
  recap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recapTotal: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  recapText: { color: colors.textMuted, fontSize: 14 },
  recapValue: { color: colors.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  footer: { gap: spacing.xs, paddingTop: spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 15, lineHeight: 21 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
