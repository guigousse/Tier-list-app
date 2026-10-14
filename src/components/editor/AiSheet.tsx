import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { creditCost, CREDITS, generateCards, useAiJob } from '../../lib/aiGenerate';
import { Clickable } from '../Clickable';
import { CardIcon } from '../CardIcon';
import { Button, Field, Sheet } from '../ui';

const COUNTS = [5, 8, 10, 12, 15, 20];

/**
 * AI generation, step by step: 1. theme (the list's title to start with), 2. how
 * many cards, 3. images or not. The credit cost follows the choices; then the
 * progress of the generation.
 */
export function AiSheet({ visible, onClose, listId, title }: { visible: boolean; onClose: () => void; listId: string; title: string }) {
  const [step, setStep] = useState(0);
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
      setStep(0);
      setTheme(title);
    }
  }

  const cost = creditCost(count, images);
  const start = () => {
    setShowJob(true);
    generateCards(listId, theme.trim(), count, images);
  };

  const credits = (
    <View style={styles.credits} accessibilityLabel={`${cost} crédits`}>
      <Ionicons name="sparkles" size={13} color="#FFD84A" />
      <Text style={styles.creditsText}>{cost}</Text>
    </View>
  );

  if (showJob && job) {
    const iconsTotal = job.cards;
    const progress = iconsTotal ? (job.icons + job.failed) / iconsTotal : 0;
    return (
      <Sheet visible={visible} onClose={onClose} title="Génération" footer={<Button label={running ? 'Continuer en arrière-plan' : 'Terminé'} onPress={onClose} />}>
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
                {job.phase === 'icons' ? <Text style={styles.hint}>Les images arrivent une par une : vous pouvez fermer, elles continuent d’arriver.</Text> : null}
              </View>
            ) : null}
          </View>
        )}
      </Sheet>
    );
  }

  const last = step === 2;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Générer avec l’IA"
      headerRight={credits}
      footer={
        <View style={styles.footer}>
          {step > 0 ? <Button variant="secondary" label="Retour" icon="arrow-back" onPress={() => setStep(step - 1)} style={{ flex: 1 }} /> : null}
          <Button
            label={last ? 'Générer' : 'Suivant'}
            icon={last ? 'sparkles' : 'arrow-forward'}
            disabled={step === 0 && !theme.trim()}
            onPress={() => (last ? start() : setStep(step + 1))}
            style={{ flex: 2 }}
          />
        </View>
      }
    >
      <View style={styles.steps}>
        {['Thème', 'Cartes', 'Images'].map((label, i) => (
          <View key={label} style={[styles.stepDot, i <= step && styles.stepDotOn]}>
            <Text style={[styles.stepText, i <= step && { color: colors.text }]}>
              {i + 1}. {label}
            </Text>
          </View>
        ))}
      </View>

      {step === 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.question}>Sur quel thème ?</Text>
          <Field value={theme} onChangeText={setTheme} placeholder="Ex. : Pizzas, films de Noël, métiers de rêve…" maxLength={80} autoFocus returnKeyType="next" onSubmitEditing={() => theme.trim() && setStep(1)} />
        </View>
      ) : step === 1 ? (
        <View style={{ gap: spacing.md }}>
          <Text style={styles.question}>Combien de cartes ?</Text>
          <View style={styles.stepper}>
            <Clickable accessibilityRole="button" accessibilityLabel="Une carte de moins" onPress={() => setCount(Math.max(3, count - 1))} style={styles.stepperButton}>
              <Ionicons name="remove" size={24} color={colors.text} />
            </Clickable>
            <Text style={styles.count}>{count}</Text>
            <Clickable accessibilityRole="button" accessibilityLabel="Une carte de plus" onPress={() => setCount(Math.min(20, count + 1))} style={styles.stepperButton}>
              <Ionicons name="add" size={24} color={colors.text} />
            </Clickable>
          </View>
          <View style={styles.chips}>
            {COUNTS.map((n) => (
              <Clickable key={n} accessibilityRole="button" onPress={() => setCount(n)} style={[styles.chip, n === count && styles.chipOn]}>
                <Text style={[styles.chipText, n === count && { color: colors.primaryText }]}>{n}</Text>
              </Clickable>
            ))}
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Text style={styles.question}>Avec des images ?</Text>
          <Clickable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: images }}
            onPress={() => setImages(!images)}
            style={[styles.check, images && styles.checkOn]}
          >
            <Ionicons name={images ? 'checkbox' : 'square-outline'} size={26} color={images ? colors.primary : colors.textMuted} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.checkTitle}>Générer aussi les images des cartes</Text>
              <Text style={styles.hint}>Des icônes dessinées dans le style de Tiercraft. Elles arrivent après les mots, une par une.</Text>
            </View>
            <View style={styles.previews}>
              <CardIcon id="croissant" size={30} />
              <CardIcon id="gamepad" size={30} />
            </View>
          </Clickable>
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
            <Text style={[styles.recapText, { color: colors.text, fontWeight: '800' }]}>Total</Text>
            <Text style={[styles.recapValue, { fontSize: 18 }]}>{cost} crédits</Text>
          </View>
          <Text style={styles.hint}>Pendant la phase de test, rien n’est décompté.</Text>
        </View>
      )}
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
  steps: { flexDirection: 'row', gap: 6 },
  stepDot: { flex: 1, paddingVertical: 6, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  stepDotOn: { borderBottomColor: colors.primary },
  stepText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  question: { color: colors.text, fontSize: 18, fontWeight: '800' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  stepperButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  count: { color: colors.text, fontSize: 44, fontWeight: '900', minWidth: 70, textAlign: 'center', fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  chip: { minWidth: 46, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.surfaceAlt, alignItems: 'center' },
  chipOn: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  checkOn: { borderColor: colors.primary, backgroundColor: 'rgba(124, 92, 255, 0.1)' },
  checkTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  previews: { gap: 2 },
  recap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recapTotal: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  recapText: { color: colors.textMuted, fontSize: 14 },
  recapValue: { color: colors.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 15, lineHeight: 21 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
