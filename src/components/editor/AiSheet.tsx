import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, radius, readableTextColor, spacing } from '../../constants/theme';
import { aiBusy, CREDITS, generateImages, generateTiers, generateWords, imageChoices, replaceableCards, imageCredits, MIN_IMAGES, sheetSizes, tierCredits, type TierTone, useAiJob, wordCredits } from '../../lib/aiGenerate';
import { openWallet, useCredits } from '../../lib/credits';
import { useTierStore } from '../../store/useTierStore';
import type { Params } from '../../lib/i18n';
import { useT } from '../../lib/i18n/useT';
import { Clickable } from '../Clickable';
import { CardView } from '../CardView';
import { EnergyAmount } from '../Energy';
import { Button, Field, Sheet } from '../ui';

const COUNTS = [5, 8, 10, 12, 15, 20];
// Labels looked up when shown: each tone's text key is `editor.ai.tone.<tone>`.
const TONES: TierTone[] = ['humour', 'serieux', 'fantaisiste', 'enfantin', 'vulgaire'];

type Props = { visible: boolean; onClose: () => void; listId: string };
type Panel = { title: string; footer: ReactNode; body: ReactNode };
type Mode = 'words' | 'images' | 'tiers';

/**
 * Shows the questions on each opening, or the generation of this kind when one is
 * under way. Returns whether to show the generation, and a way to switch to it.
 */
function useJobView(visible: boolean, listId: string, kind: Mode, onOpen?: () => void) {
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

/** The balance the server last gave (null: not known yet, the server decides). */
const short = (cost: number, balance: number | null) => balance !== null && cost > balance;

function Balance({ cost }: { cost: number }) {
  const balance = useCredits((s) => s.balance);
  const { t } = useT();
  return (
    <>
      <View style={[styles.recap, styles.recapTotal]}>
        <Text style={[styles.recapText, { color: colors.text, fontWeight: '800' }]}>{t('editor.ai.cost')}</Text>
        <EnergyAmount amount={cost} size={18} style={[styles.recapValue, { fontSize: 18 }, short(cost, balance) && { color: colors.danger }]} />
      </View>
      <View style={styles.recap}>
        <Text style={styles.recapText}>{t('editor.ai.balance')}</Text>
        <EnergyAmount amount={balance} style={styles.recapValue} />
      </View>
    </>
  );
}

function Footer({ label, cost, ready, busy, onPress, note }: { label: string; cost: number; ready: boolean; busy: boolean; onPress: () => void; note?: string }) {
  const balance = useCredits((s) => s.balance);
  const affordable = !short(cost, balance);
  const { t } = useT();
  return (
    <View style={styles.footer}>
      {note ? <Text style={styles.short}>{note}</Text> : null}
      {busy ? <Text style={styles.short}>{t('editor.ai.busy')}</Text> : null}
      {!affordable ? <Text style={styles.short}>{t('editor.ai.short', { count: cost - (balance ?? 0) })}</Text> : null}
      <Button
        label={`${label} ·`}
        icon="sparkles"
        after={<EnergyAmount amount={cost} size={18} style={styles.buttonCost} />}
        disabled={!ready || busy || !affordable}
        onPress={onPress}
      />
    </View>
  );
}

/**
 * The cards: 1. theme (the list's title to start with), 2. how many new cards, 3. the
 * cards whose word to replace (1 credit each, like a new one), then the cost. The list takes the theme as its title. The images come after, once the player
 * has checked the words.
 */
function useWordsPanel({ visible, onClose, listId, title }: Props & { title: string }): Panel {
  const list = useTierStore((s) => s.lists[listId]);
  const { t } = useT();
  const [theme, setTheme] = useState(title);
  const [count, setCount] = useState(10);
  // Cards whose word the player wants replaced: none to start with.
  const [picked, setPicked] = useState<string[]>([]);
  const { job, running, busy, showJob, setShowJob } = useJobView(visible, listId, 'words', () => {
    setTheme(title);
    setPicked([]);
  });
  const candidates = list ? replaceableCards(list) : [];
  const replace = candidates.filter((c) => picked.includes(c.id));
  const cost = wordCredits(count, replace.length);
  const togglePick = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const start = () => {
    setShowJob(true);
    generateWords(listId, theme.trim(), count, replace.map((c) => c.id));
  };

  if (showJob && job) {
    return {
      title: t('editor.ai.wordsJob'),
      footer: <Button label={running ? t('editor.ai.background') : t('editor.ai.checkCards')} onPress={onClose} />,
      body:
        job.phase === 'working' ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>{t('editor.ai.wordsWorking')}</Text>
          </View>
        ) : job.phase === 'error' ? (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.error}>{job.error}</Text>
            <Button variant="secondary" label={t('editor.ai.editRequest')} icon="arrow-back" onPress={() => setShowJob(false)} />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={styles.status}>
              <Ionicons name="checkmark-circle" size={22} color="#2EAD6B" />
              <Text style={styles.statusText}>{wordsDone(t, job.cards, job.replaced ?? 0)}</Text>
            </View>
            <Text style={styles.hint}>{t('editor.ai.wordsCheckHint')}</Text>
          </View>
        ),
    };
  }

  return {
    title: t('editor.ai.wordsTitle'),
    footer: <Footer label={t('editor.ai.generate')} cost={cost} ready={theme.trim().length > 0 && cost > 0} busy={busy} onPress={start} />,
    body: (
      <>
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('editor.ai.theme')}</Text>
        </View>
        <Field value={theme} onChangeText={setTheme} placeholder={t('editor.ai.themePlaceholder')} maxLength={60} returnKeyType="done" />
        <Text style={styles.hint}>{t('editor.ai.themeHint')}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t('editor.ai.newCards')}</Text>
          </View>
          <View style={styles.stepper}>
            <Clickable
              accessibilityRole="button"
              accessibilityLabel={t('editor.ai.oneLess')}
              onPress={() => setCount(count <= 3 ? 0 : count - 1)}
              style={styles.stepperButton}
            >
              <Ionicons name="remove" size={20} color={colors.text} />
            </Clickable>
            <Text style={styles.count}>{count}</Text>
            <Clickable
              accessibilityRole="button"
              accessibilityLabel={t('editor.ai.oneMore')}
              onPress={() => setCount(count === 0 ? 3 : Math.min(20, count + 1))}
              style={styles.stepperButton}
            >
              <Ionicons name="add" size={20} color={colors.text} />
            </Clickable>
          </View>
        </View>
        <View style={styles.chips}>
          {[0, ...COUNTS].map((n) => (
            <Clickable key={n} accessibilityRole="button" onPress={() => setCount(n)} style={[styles.chip, n === count && styles.chipOn]}>
              <Text style={[styles.chipText, n === count && { color: colors.primaryText }]}>{n || t('editor.ai.none')}</Text>
            </Clickable>
          ))}
        </View>
      </View>

      {candidates.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{t('editor.ai.toReplace', { n: replace.length })}</Text>
            {replace.length ? (
              <Clickable accessibilityRole="button" onPress={() => setPicked([])}>
                <Text style={styles.link}>{t('editor.ai.none')}</Text>
              </Clickable>
            ) : null}
          </View>
          <View style={styles.grid}>
            {candidates.map((c) => {
              const on = picked.includes(c.id);
              return (
                <Clickable
                  key={c.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={c.label}
                  accessibilityState={{ checked: on }}
                  onPress={() => togglePick(c.id)}
                  style={[styles.pick, on && styles.pickOn]}
                >
                  <View style={!on && styles.pickOff}>
                    <CardView card={c} size={PICK_SIZE} />
                  </View>
                  <View style={[styles.tick, on && styles.tickOn]}>{on ? <Ionicons name="refresh" size={13} color="#FFFFFF" /> : null}</View>
                </Clickable>
              );
            })}
          </View>
          <Text style={styles.hint}>{t('editor.ai.replaceHint')}</Text>
        </View>
      ) : null}

      <View style={styles.total}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('editor.ai.total')}</Text>
        </View>
        <View style={styles.recap}>
          <Text style={styles.recapText}>
            {[count ? t('editor.ai.newCount', { count }) : '', replace.length ? t('editor.ai.replacedCount', { count: replace.length }) : '']
              .filter(Boolean)
              .join(t('editor.ai.and'))}{' '}
            {t('editor.ai.fixedPrice')}
          </Text>
          <EnergyAmount amount={cost} size={14} style={styles.recapValue} />
        </View>
        <Text style={styles.hint}>{t('editor.ai.imagesLater')}</Text>
        <Balance cost={cost} />
      </View>
      </>
    ),
  };
}

function wordsDone(t: (key: string, params?: Params) => string, cards: number, replaced: number): string {
  const parts = [];
  if (cards) parts.push(t('editor.ai.cardsAdded', { count: cards }));
  if (replaced) parts.push(t('editor.ai.replacedCount', { count: replaced }));
  return parts.join(' · ') || t('editor.ai.noCards');
}

/**
 * The tiers: new names in a tone, tied to the theme (the list's title to start with)
 * and to its cards, best tier first. 1 credit per tier; the title and cards stay.
 */
function useTiersPanel({ visible, onClose, listId, title }: Props & { title: string }): Panel {
  const tiers = useTierStore((s) => s.lists[listId]?.tiers) ?? [];
  const { t } = useT();
  const [theme, setTheme] = useState(title);
  const [tone, setTone] = useState<TierTone>('humour');
  const { job, running, busy, showJob, setShowJob } = useJobView(visible, listId, 'tiers', () => setTheme(title));
  const cost = tierCredits(tiers.length);
  const start = () => {
    setShowJob(true);
    generateTiers(listId, theme.trim(), tone);
  };

  if (showJob && job) {
    return {
      title: t('editor.ai.tiersJob'),
      footer: <Button label={running ? t('editor.ai.background') : t('editor.done')} onPress={onClose} />,
      body:
        job.phase === 'working' ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.statusText}>{t('editor.ai.tiersWorking')}</Text>
          </View>
        ) : job.phase === 'error' ? (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.error}>{job.error}</Text>
            <Button variant="secondary" label={t('editor.ai.editRequest')} icon="arrow-back" onPress={() => setShowJob(false)} />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={styles.status}>
              <Ionicons name="checkmark-circle" size={22} color="#2EAD6B" />
              <Text style={styles.statusText}>{t('editor.ai.tiersRenamed', { count: job.tiers ?? 0 })}</Text>
            </View>
            <View style={styles.tierPreview}>
              {tiers.map((tier) => (
                <View key={tier.id} style={[styles.tierChip, { backgroundColor: tier.color }]}>
                  <Text style={[styles.tierChipText, { color: readableTextColor(tier.color) }]}>{tier.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.hint}>{t('editor.ai.tiersDoneHint')}</Text>
            <Button variant="secondary" label={t('editor.ai.otherTone')} icon="refresh" onPress={() => setShowJob(false)} />
          </View>
        ),
    };
  }

  return {
    title: t('editor.ai.tiersTitle'),
    footer: <Footer label={t('editor.rename')} cost={cost} ready={theme.trim().length > 0 && tiers.length > 0} busy={busy} onPress={start} />,
    body: (
      <>
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t('editor.ai.theme')}</Text>
          </View>
          <Field value={theme} onChangeText={setTheme} placeholder={t('editor.ai.themePlaceholder')} maxLength={60} returnKeyType="done" />
          <Text style={styles.hint}>{t('editor.ai.tiersThemeHint')}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t('editor.ai.tone')}</Text>
          </View>
          <View style={styles.chips}>
            {TONES.map((option) => (
              <Clickable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: option === tone }}
                onPress={() => setTone(option)}
                style={[styles.chip, option === tone && styles.chipOn]}
              >
                <Text style={[styles.chipText, option === tone && { color: colors.primaryText }]}>{t(`editor.ai.tone.${option}`)}</Text>
              </Clickable>
            ))}
          </View>
          <View style={styles.tierPreview}>
            {tiers.map((tier) => (
              <View key={tier.id} style={[styles.tierChip, { backgroundColor: tier.color }]}>
                <Text style={[styles.tierChipText, { color: readableTextColor(tier.color) }]}>{tier.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.hint}>{t('editor.ai.toneHint')}</Text>
        </View>

        <View style={styles.total}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t('editor.ai.total')}</Text>
          </View>
          <View style={styles.recap}>
            <Text style={styles.recapText}>
              {t('editor.ai.tiersRenamed', { count: tiers.length })} {t('editor.ai.fixedPrice')}
            </Text>
            <EnergyAmount amount={cost} size={14} style={styles.recapValue} />
          </View>
          <Balance cost={cost} />
        </View>
      </>
    ),
  };
}

/**
 * The images: every card but the photos. Those without a picture (generated, edited or
 * added by hand) start selected; the illustrated ones start aside, picked to be drawn
 * again (a new image joins the library beside the old one). At least `MIN_IMAGES`, all
 * drawn together on one sheet.
 */
function useImagesPanel({ visible, onClose, listId }: Props): Panel {
  const list = useTierStore((s) => s.lists[listId]);
  const { t, locale } = useT();
  // Bare cards left out, illustrated cards picked: a card added meanwhile starts right.
  const [toggled, setToggled] = useState<string[]>([]);
  const { job, running, busy, showJob, setShowJob } = useJobView(visible, listId, 'images', () => setToggled([]));
  const { toDraw, toRedraw } = list ? imageChoices(list) : { toDraw: [], toRedraw: [] };
  const cards = [...toDraw, ...toRedraw];
  const isOn = (id: string) => toDraw.some((c) => c.id === id) !== toggled.includes(id);
  const selected = cards.filter((c) => isOn(c.id));
  const n = selected.length;
  const redrawn = selected.filter((c) => toRedraw.includes(c)).length;
  const cost = imageCredits(n);
  const toggle = (id: string) => setToggled(toggled.includes(id) ? toggled.filter((x) => x !== id) : [...toggled, id]);
  const start = () => {
    setShowJob(true);
    generateImages(listId, selected.map((c) => c.id));
  };

  if (showJob && job) {
    const progress = job.cards ? (job.icons + job.failed) / job.cards : 1;
    return {
      title: t('editor.ai.imagesJob'),
      footer: <Button label={running ? t('editor.ai.background') : t('editor.done')} onPress={onClose} />,
      body: (
        <View style={{ gap: spacing.sm }}>
          <View style={styles.status}>
            {running ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="checkmark-circle" size={22} color="#2EAD6B" />}
            <Text style={styles.statusText}>
              {t('editor.ai.imagesProgress', { done: job.icons, total: job.cards })}
              {job.failed ? ` · ${t('editor.ai.withoutImage', { failed: job.failed })}` : ''}
            </Text>
          </View>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          {job.error ? <Text style={styles.error}>{job.error}</Text> : null}
          {running ? (
            <Text style={styles.hint}>{t('editor.ai.imagesWorkingHint')}</Text>
          ) : null}
        </View>
      ),
    };
  }

  const perImage = n ? (cost / n).toLocaleString(locale, { maximumFractionDigits: 1 }) : '0';
  // Beyond 20, a second sheet: said, or the jump in price would look like a mistake.
  const sheets = sheetSizes(n);
  const allOn = n === cards.length;
  const note =
    cards.length < MIN_IMAGES
      ? t('editor.ai.minCards', { min: MIN_IMAGES })
      : n < MIN_IMAGES
        ? t('editor.ai.minSelect', { min: MIN_IMAGES })
        : undefined;
  // Everything on, or back to the start: the bare cards on, the illustrated ones aside.
  const selectAll = () => setToggled(allOn ? [] : toRedraw.map((c) => c.id));
  return {
    title: t('editor.ai.imagesTitle'),
    footer: <Footer label={t('editor.ai.prepare')} cost={cost} ready={n >= MIN_IMAGES} busy={busy} note={note} onPress={start} />,
    body: (
      <>
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('editor.ai.toIllustrate', { n, total: cards.length })}</Text>
          {cards.length ? (
            <Clickable accessibilityRole="button" onPress={selectAll}>
              <Text style={styles.link}>{allOn ? t('editor.reset') : t('editor.ai.selectAll')}</Text>
            </Clickable>
          ) : null}
        </View>
        {cards.length ? (
          <View style={styles.grid}>
            {cards.map((c) => {
              const on = isOn(c.id);
              return (
                <Clickable
                  key={c.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={c.label}
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(c.id)}
                  style={[styles.pick, on && styles.pickOn]}
                >
                  <View style={!on && styles.pickOff}>
                    <CardView card={c} size={PICK_SIZE} />
                  </View>
                  <View style={[styles.tick, on && styles.tickOn]}>{on ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}</View>
                </Clickable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.hint}>{t('editor.ai.addCardsFirst')}</Text>
        )}
      </View>

      <View style={styles.total}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{t('editor.ai.total')}</Text>
        </View>
        <View style={styles.recap}>
          <Text style={styles.recapText}>
            {t('editor.ai.imageCount', { count: n })}
            {redrawn ? ` ${t('editor.ai.redrawn', { count: redrawn })}` : ''} · {t('editor.ai.perImage', { price: perImage })}
          </Text>
          <EnergyAmount amount={cost} size={14} style={styles.recapValue} />
        </View>
        {sheets.length > 1 ? (
          <Text style={styles.hint}>
            {t('editor.ai.sheets', { sheets: sheets.length, sizes: sheets.join(' + '), credits: CREDITS.sheet })}
          </Text>
        ) : null}
        <Balance cost={cost} />
      </View>
      </>
    ),
  };
}

/**
 * The single AI window, opened by the wand: a text tab (generate cards), an images tab
 * (draw or redraw them) and a tiers tab (rename them in a tone). Opens on the generation under way, else on the images
 * when cards are waiting for one, else on the text.
 */
export function AiSheet({ visible, onClose, listId, title }: Props & { title: string }) {
  const list = useTierStore((s) => s.lists[listId]);
  const running = useAiJob((s) => (aiBusy(s.job, listId) ? s.job!.kind : null));
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('words');
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setMode(running ?? (list && imageChoices(list).toDraw.length > 0 ? 'images' : 'words'));
  }
  // The balance shown must be the server's: refreshed each time the window opens.
  useEffect(() => {
    if (visible) openWallet();
  }, [visible]);
  // Both panels follow the window, not the tab: switching tabs keeps what was chosen.
  const words = useWordsPanel({ visible, onClose, listId, title });
  const images = useImagesPanel({ visible, onClose, listId });
  const tiers = useTiersPanel({ visible, onClose, listId, title });
  const panel = mode === 'words' ? words : mode === 'images' ? images : tiers;
  const tabs: { mode: Mode; label: string; icon: 'text' | 'image' | 'reorder-four' }[] = [
    { mode: 'words', label: t('editor.ai.tabText'), icon: 'text' },
    { mode: 'images', label: t('editor.ai.tabImages'), icon: 'image' },
    { mode: 'tiers', label: t('editor.ai.tabTiers'), icon: 'reorder-four' },
  ];
  return (
    <Sheet visible={visible} onClose={onClose} title={panel.title} footer={panel.footer}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const on = tab.mode === mode;
          return (
            <Clickable
              key={tab.mode}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setMode(tab.mode)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Ionicons name={tab.icon} size={18} color={on ? colors.primaryText : colors.text} />
              <Text style={[styles.tabText, on && { color: colors.primaryText }]}>{tab.label}</Text>
              {running === tab.mode ? <ActivityIndicator size="small" color={on ? colors.primaryText : colors.primary} /> : null}
            </Clickable>
          );
        })}
      </View>
      {panel.body}
    </Sheet>
  );
}

const PICK_SIZE = 72;

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm, padding: 4, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md },
  tabOn: { backgroundColor: colors.primary },
  tabText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  tierPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tierChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm },
  tierChipText: { fontSize: 13, fontWeight: '800' },
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
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pick: { padding: 3, borderRadius: 11, borderWidth: 2, borderColor: 'transparent' },
  pickOn: { borderColor: colors.primary },
  pickOff: { opacity: 0.35 },
  tick: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.textMuted,
    backgroundColor: colors.surface,
  },
  tickOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  recap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recapTotal: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  recapText: { color: colors.textMuted, fontSize: 14 },
  recapValue: { color: colors.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  buttonCost: { color: colors.primaryText, fontSize: 16 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  footer: { gap: spacing.xs, paddingTop: spacing.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 15, lineHeight: 21 },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
