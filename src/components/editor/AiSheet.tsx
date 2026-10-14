import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../constants/theme';
import { aiBusy, cardsNeedingImage, CREDITS, generateImages, generateWords, imageCredits, TEST_BALANCE, useAiJob, wordCredits } from '../../lib/aiGenerate';
import { useTierStore } from '../../store/useTierStore';
import { Clickable } from '../Clickable';
import { CardIcon } from '../CardIcon';
import { Button, Field, Sheet } from '../ui';

const COUNTS = [5, 8, 10, 12, 15, 20];

type Props = { visible: boolean; onClose: () => void; listId: string };

/**
 * Shows the questions on each opening, or the generation of this kind when one is
 * under way. Returns whether to show the generation, and a way to switch to it.
 */
function useJobView(visible: boolean, listId: string, kind: 'words' | 'images', onOpen?: () => void) {
  const job = useAiJob((s) => (s.job?.listId === listId && s.job.kind === kind ? s.job : null));
  const running = job?.phase === 'working';
  // Another generation of this list (only one at a time).
  const busy = useAiJob((s) => aiBusy(s.job, listId)) && !running;
  const [showJob, setShowJob] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setShowJob(Boolean(running));
      onOpen?.();
    }
  }
  return { job, running, busy, showJob: showJob && job ? job : null, setShowJob };
}

function Balance({ cost }: { cost: number }) {
  // No credits yet: a test balance, nothing is taken.
  const balance = TEST_BALANCE;
  return (
    <>
      <View style={[styles.recap, styles.recapTotal]}>
        <Text style={[styles.recapText, { color: colors.text, fontWeight: '800' }]}>Coût</Text>
        <Text style={[styles.recapValue, { fontSize: 18 }, cost > balance && { color: colors.danger }]}>{cost} crédits</Text>
      </View>
      <View style={styles.recap}>
        <Text style={styles.recapText}>Votre solde</Text>
        <Text style={styles.recapValue}>{balance} crédits</Text>
      </View>
      <Text style={styles.hint}>Phase de test : solde fictif, rien n’est décompté.</Text>
    </>
  );
}

function Footer({ label, cost, ready, busy, onPress }: { label: string; cost: number; ready: boolean; busy: boolean; onPress: () => void }) {
  const affordable = cost <= TEST_BALANCE;
  return (
    <View style={styles.footer}>
      {busy ? <Text style={styles.short}>Une génération est déjà en cours pour cette liste.</Text> : null}
      {!affordable ? <Text style={styles.short}>Solde insuffisant : il manque {cost - TEST_BALANCE} crédits.</Text> : null}
      <Button label={`${label} · ${cost} crédits`} icon="sparkles" disabled={!ready || busy || !affordable} onPress={onPress} />
    </View>
  );
}

/**
 * First step, the words: 1. theme (the list's title to start with), 2. how many cards,
 * then the cost. The list takes the theme as its title. The images come after, once
 * the player has checked the words (see `AiImagesSheet`).
 */
export function AiWordsSheet({ visible, onClose, listId, title }: Props & { title: string }) {
  const [theme, setTheme] = useState(title);
  const [count, setCount] = useState(10);
  const { job, running, busy, showJob, setShowJob } = useJobView(visible, listId, 'words', () => setTheme(title));
  const cost = wordCredits(count);
  const start = () => {
    setShowJob(true);
    generateWords(listId, theme.trim(), count);
  };

  if (showJob && job) {
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        title="Génération des cartes"
        footer={<Button label={running ? 'Continuer en arrière-plan' : 'Vérifier les cartes'} onPress={onClose} />}
      >
        {job.phase === 'working' ? (
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
            <Text style={styles.hint}>
              Vérifiez les cartes : modifiez ou supprimez celles qui ne vous plaisent pas. Ensuite, la baguette aux images les illustrera toutes.
            </Text>
          </View>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Générer les cartes"
      footer={<Footer label="Générer" cost={cost} ready={theme.trim().length > 0} busy={busy} onPress={start} />}
    >
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionNumber}>1</Text>
          <Text style={styles.sectionTitle}>Thème de la liste</Text>
        </View>
        <Field value={theme} onChangeText={setTheme} placeholder="Ex. : Pizzas, films de Noël, métiers de rêve…" maxLength={60} returnKeyType="done" />
        <Text style={styles.hint}>La liste prendra ce thème pour titre.</Text>
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

      <View style={styles.total}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionNumber}>3</Text>
          <Text style={styles.sectionTitle}>Total</Text>
        </View>
        <View style={styles.recap}>
          <Text style={styles.recapText}>
            {count} mot{count > 1 ? 's' : ''} × {CREDITS.word} crédit
          </Text>
          <Text style={styles.recapValue}>{cost}</Text>
        </View>
        <Text style={styles.hint}>Les images se génèrent ensuite, une fois les cartes vérifiées.</Text>
        <Balance cost={cost} />
      </View>
    </Sheet>
  );
}

/**
 * Second step, the images: every card of the list still without a picture (generated,
 * edited or added by hand), all drawn together on one sheet, then the cost.
 */
export function AiImagesSheet({ visible, onClose, listId }: Props) {
  const list = useTierStore((s) => s.lists[listId]);
  const { job, running, busy, showJob, setShowJob } = useJobView(visible, listId, 'images');
  const cards = list ? cardsNeedingImage(list) : [];
  const n = cards.length;
  const cost = imageCredits(n);
  const start = () => {
    setShowJob(true);
    generateImages(listId);
  };

  if (showJob && job) {
    const progress = job.cards ? (job.icons + job.failed) / job.cards : 1;
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        title="Génération des images"
        footer={<Button label={running ? 'Continuer en arrière-plan' : 'Terminé'} onPress={onClose} />}
      >
        <View style={{ gap: spacing.sm }}>
          <View style={styles.status}>
            {running ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="checkmark-circle" size={22} color="#2EAD6B" />}
            <Text style={styles.statusText}>
              Images : {job.icons} / {job.cards}
              {job.failed ? ` · ${job.failed} sans image` : ''}
            </Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          {running ? (
            <Text style={styles.hint}>Toutes les images sont dessinées ensemble, en une trentaine de secondes : vous pouvez fermer, elles arriveront quand même.</Text>
          ) : null}
        </View>
      </Sheet>
    );
  }

  const perImage = n ? (cost / n).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '0';
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Générer les images"
      footer={<Footer label="Dessiner" cost={cost} ready={n > 0} busy={busy} onPress={start} />}
    >
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionNumber}>1</Text>
            <Text style={styles.sectionTitle}>Cartes à illustrer</Text>
          </View>
          <CardIcon id="camera" size={40} />
        </View>
        {n ? (
          <View style={styles.labels}>
            {cards.map((c) => (
              <View key={c.id} style={styles.label}>
                <Text style={styles.labelText} numberOfLines={1}>
                  {c.label}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.hint}>Toutes les cartes de la liste ont déjà une image.</Text>
        )}
        {n ? <Text style={styles.hint}>Les cartes qui ont déjà une image ou une photo la gardent.</Text> : null}
      </View>

      <View style={styles.total}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionNumber}>2</Text>
          <Text style={styles.sectionTitle}>Total</Text>
        </View>
        <View style={styles.recap}>
          <Text style={styles.recapText}>
            {n} image{n > 1 ? 's' : ''} · {perImage} crédits l’image
          </Text>
          <Text style={styles.recapValue}>{cost}</Text>
        </View>
        <Balance cost={cost} />
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
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  label: { maxWidth: '100%', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  labelText: { color: colors.text, fontSize: 14, fontWeight: '600' },
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
