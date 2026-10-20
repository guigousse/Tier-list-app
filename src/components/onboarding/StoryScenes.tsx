import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { AvatarDrawing } from '../Avatar';
import { colors, TIER_COLORS } from '../../constants/theme';
import { DEFAULT_AVATAR, type AvatarConfig } from '../../lib/avatar';
import { useT } from '../../lib/i18n/useT';
import { FINGER, Finger, fingerOffset, MiniCard, Stage, step, useLoop, type SceneProps } from './kit';

type Props = SceneProps & { height: number };

/**
 * Card images of the shared AI library (supabase card-icons), shipped with the app:
 * the welcome story shows the real thing at once, even offline on the first launch.
 */
const IMAGES = {
  strawberry: require('../../../assets/onboarding/strawberry.png'),
  mango: require('../../../assets/onboarding/mango.png'),
  cherry: require('../../../assets/onboarding/cherry.png'),
  peach: require('../../../assets/onboarding/peach.png'),
  watermelon: require('../../../assets/onboarding/watermelon.png'),
  pineapple: require('../../../assets/onboarding/pineapple.png'),
  banana: require('../../../assets/onboarding/banana.png'),
  kiwi: require('../../../assets/onboarding/kiwi.png'),
  lemon: require('../../../assets/onboarding/lemon.png'),
  'red-apple': require('../../../assets/onboarding/red-apple.png'),
  pizza: require('../../../assets/onboarding/pizza.png'),
  burger: require('../../../assets/onboarding/burger.png'),
  sushi: require('../../../assets/onboarding/sushi.png'),
  taco: require('../../../assets/onboarding/taco.png'),
  donut: require('../../../assets/onboarding/donut.png'),
  croissant: require('../../../assets/onboarding/croissant.png'),
} satisfies Record<string, ImageSourcePropType>;

type Picture = keyof typeof IMAGES;

/** A card with its library image, as cards of public lists look in the app. */
function PictureCard({ size, color, name }: { size: number; color: string; name: Picture }) {
  return <MiniCard size={size} color={color} emoji="" image={<Image source={IMAGES[name]} style={{ width: size * 0.82, height: size * 0.82 }} />} />;
}

/** Pops in (0 → 1.15 → 1) between `from` and `to` ms. */
function pop(t: number, duration: number, from: number, to: number): number {
  'worklet';
  const p = step(t, duration, from, to, false);
  return p < 0.7 ? (p / 0.7) * 1.15 : 1.15 - ((p - 0.7) / 0.3) * 0.15;
}

/** Position on a path of keyframes [ms, x, y, …]: still between them, eased from one to the next. */
function along(t: number, duration: number, keys: number[]): { x: number; y: number } {
  'worklet';
  let x = keys[1];
  let y = keys[2];
  for (let i = 3; i < keys.length; i += 3) {
    // A move takes the 600 ms before its keyframe.
    const p = step(t, duration, keys[i] - 600, keys[i]);
    x += (keys[i + 1] - keys[i - 2]) * p;
    y += (keys[i + 2] - keys[i - 1]) * p;
  }
  return { x, y };
}

/** Taps: 0 → 1 → 0 around each time of `at`. */
function presses(t: number, duration: number, at: number[]): number {
  'worklet';
  let sum = 0;
  for (let i = 0; i < at.length; i++) sum += step(t, duration, at[i] - 120, at[i]) - step(t, duration, at[i] + 60, at[i] + 220);
  return sum;
}

/** The player, as the story shows them, and the friend they challenge. */
const ME: AvatarConfig = { ...DEFAULT_AVATAR, hair: 'curly', hairColor: 'chestnut', glasses: 'round', bg: 'sky' };
const FRIEND: AvatarConfig = { ...DEFAULT_AVATAR, hair: 'long', hairColor: 'red', eyes: 'green', skin: 'p1', mouth: 'grin', bg: 'coral' };
const OTHER_FRIEND: AvatarConfig = { ...DEFAULT_AVATAR, hair: 'buzz', hairColor: 'black', skin: 'p4', beard: 'short', bg: 'mint' };

const HELLO_CARDS: Picture[] = ['pizza', 'croissant', 'sushi', 'donut', 'burger', 'taco'];
const HELLO_COLORS = ['#7A3A4E', '#7A5A2E', '#2E5A7A', '#5B3A7A', '#2E6A4F', '#3D4454'];
export const HELLO_DURATION = 3800;

/** The welcome: the tier colours sweep in, the name, and cards popping around it. */
export function HelloScene({ width: W, height: H, active, once }: Props) {
  const t = useLoop(active, HELLO_DURATION, once);
  const { t: tr } = useT();
  const c = Math.round(Math.min(W / 5.2, 72));
  const wave = useAnimatedStyle(() => {
    const p = step(t.value, HELLO_DURATION, 300, 1500, false);
    return { opacity: step(t.value, HELLO_DURATION, 100, 400), transform: [{ rotate: `${Math.sin(p * Math.PI * 4) * 22}deg` }] };
  });
  const name = useAnimatedStyle(() => {
    const p = step(t.value, HELLO_DURATION, 500, 1100);
    return { opacity: p, transform: [{ translateY: (1 - p) * 16 }] };
  });
  const sub = useAnimatedStyle(() => ({ opacity: step(t.value, HELLO_DURATION, 2400, 2900) }));
  return (
    <Stage width={W} height={H} style={{ alignItems: 'center', justifyContent: 'center', gap: 18, padding: 20 }}>
      <Animated.Text style={[styles.wave, wave]}>👋</Animated.Text>
      <Animated.View style={[{ alignItems: 'center', gap: 8 }, name]}>
        <Text style={styles.brand}>Tiercraft</Text>
        <View style={styles.brandStrip}>
          {TIER_COLORS.slice(0, 5).map((color, i) => (
            <StripBar key={color} t={t} i={i} color={color} />
          ))}
        </View>
      </Animated.View>
      <View style={styles.helloCards}>
        {HELLO_CARDS.map((card, i) => (
          <HelloCard key={card} t={t} i={i} size={c} name={card} />
        ))}
      </View>
      <Animated.Text style={[styles.helloSub, sub]}>{tr('play.onb.helloSub')}</Animated.Text>
    </Stage>
  );
}

function StripBar({ t, i, color }: { t: SharedValue<number>; i: number; color: string }) {
  const style = useAnimatedStyle(() => ({ width: 34 * step(t.value, HELLO_DURATION, 700 + i * 90, 1100 + i * 90) }));
  return <Animated.View style={[styles.stripBar, { backgroundColor: color }, style]} />;
}

function HelloCard({ t, i, size, name }: { t: SharedValue<number>; i: number; size: number; name: Picture }) {
  const at = 1200 + i * 160;
  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: pop(t.value, HELLO_DURATION, at, at + 380) },
      // A gentle float once there, each card at its own pace.
      { translateY: Math.sin(t.value * HELLO_DURATION * 0.004 + i) * 3 },
      { rotate: `${(i % 2 ? 1 : -1) * (4 + i)}deg` },
    ],
  }));
  return (
    <Animated.View style={[{ margin: 3 }, style]}>
      <PictureCard size={size} color={HELLO_COLORS[i]} name={name} />
    </Animated.View>
  );
}

const FRUITS: Picture[] = ['strawberry', 'mango', 'cherry', 'peach', 'watermelon', 'pineapple', 'banana', 'kiwi', 'lemon', 'red-apple'];
const FRUIT_COLORS = ['#7A3A4E', '#7A5A2E', '#5B3A7A', '#2E6A4F', '#2E5A7A', '#3D4454', '#7A5A2E', '#2E6A4F', '#2E5A7A', '#7A3A4E'];
/** The comparison with the friend: card, the player's tier, the friend's. */
const COMPARED: [Picture, number, number][] = [
  ['strawberry', 0, 0],
  ['mango', 1, 0],
  ['lemon', 4, 2],
];

/** When each step of the story happens (ms). */
const AT = {
  typed: [300, 1900],
  wand: 2600,
  words: 2900,
  wandAgain: 5000,
  images: 5300,
  share: 8600,
  sheet: 8800,
  friend: 10000,
  send: 10800,
  sheetDown: 11000,
  toast: 11200,
  notif: 12600,
  discover: 13900,
  compare: 14100,
};
export const CREATE_SHARE_DURATION = 18000;
/** When the captions of the story change in this scene (ms): creation, sharing, comparison. */
export const CREATE_SHARE_CAPTIONS = [0, 8200, 12400];

/**
 * Creation and sharing in one go: a title typed, the wand writes 10 cards, the wand
 * again draws their images, the list goes to a friend, her answer arrives, and the
 * comparison opens.
 */
export function CreateShareScene({ width: W, height: H, active, once }: Props) {
  const D = CREATE_SHARE_DURATION;
  const t = useLoop(active, D, once);
  const { t: tr, upper } = useT();
  const title = tr('play.onb.listTitle');
  const words = tr('play.onb.fruitNames').split(',');

  // Layout, from the size: the editor as the app shows it, in small.
  const pad = 12;
  const fieldTop = 50;
  const rowsTop = 108;
  const rowH = Math.round(Math.min(26, (H - 330) / 5 + 20));
  const trayTop = rowsTop + 5 * (rowH + 2) + 6;
  const c = Math.floor(Math.min((W - pad * 2 - 4 * 6) / 5, (H - trayTop - 26 - pad - 6) / 2));
  const gridLeft = (W - (c * 5 + 4 * 6)) / 2;
  const wandSize = 46;
  const wand = { x: W - pad - wandSize / 2 - 4, y: trayTop - wandSize / 2 - 10 };
  // As wide as its word needs (Greek's is long).
  const shareW = Math.max(100, tr('play.onb.share').length * 8 + 40);
  const share = { x: W - pad - shareW / 2, y: 12 + 15 };
  const sheetH = 196;
  const sheetTop = H - sheetH;
  const friendRow = { x: W * 0.5, y: sheetTop + 52 + 22 };
  const sendBtn = { x: W / 2, y: sheetTop + sheetH - 30 };
  const notifH = 104;
  const discover = { x: W / 2, y: 10 + notifH - 22 };

  // The finger's path: [ms, x, y] keyframes (moves eased over the 600 ms before each).
  const away = { x: W * 0.85, y: H + 40 };
  const keys = [
    0, away.x, away.y,
    AT.wand - 100, wand.x, wand.y,
    AT.wand + 700, wand.x - 30, wand.y + 60,
    AT.wandAgain - 100, wand.x, wand.y,
    AT.share - 100, share.x, share.y,
    AT.friend - 100, friendRow.x, friendRow.y,
    AT.send - 100, sendBtn.x, sendBtn.y,
    AT.sheetDown + 900, W + 40, H * 0.6,
    AT.discover - 100, discover.x, discover.y,
    AT.compare + 900, W + 40, H * 0.75,
  ];
  const pressed = useDerivedValue(() => presses(t.value, D, [AT.wand, AT.wandAgain, AT.share, AT.friend, AT.send, AT.discover]));
  const fingerStyle = useAnimatedStyle(() => {
    const p = along(t.value, D, keys);
    const o = fingerOffset(p.x, p.y);
    const shown =
      step(t.value, D, 1700, 2000) - step(t.value, D, AT.sheetDown + 500, AT.sheetDown + 900) + step(t.value, D, AT.notif + 300, AT.notif + 600) - step(t.value, D, AT.compare + 500, AT.compare + 900);
    return { opacity: shown, transform: [{ translateX: o.x }, { translateY: o.y }] };
  });

  const wandStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.08 }] }));
  const sparkle = useAnimatedStyle(() => {
    const busy = step(t.value, D, AT.wand, AT.words + 1700, false) + step(t.value, D, AT.wandAgain, AT.images + 2000, false);
    return { transform: [{ rotate: `${busy * 540}deg` }] };
  });
  const count = useAnimatedStyle(() => ({ opacity: step(t.value, D, AT.words, AT.words + 300) }));
  const shareStyle = useAnimatedStyle(() => {
    const ready = step(t.value, D, AT.images + 1800, AT.images + 2200);
    const press = step(t.value, D, AT.share - 120, AT.share) - step(t.value, D, AT.share + 60, AT.share + 220);
    return { opacity: 0.35 + ready * 0.65, transform: [{ scale: 1 + ready * 0.06 - press * 0.08 }] };
  });

  const veil = useAnimatedStyle(() => ({ opacity: (step(t.value, D, AT.sheet, AT.sheet + 300) - step(t.value, D, AT.sheetDown, AT.sheetDown + 300)) * 0.55 }));
  const sheet = useAnimatedStyle(() => {
    const p = step(t.value, D, AT.sheet, AT.sheet + 400) - step(t.value, D, AT.sheetDown, AT.sheetDown + 350);
    return { transform: [{ translateY: (1 - p) * (sheetH + 20) }] };
  });
  const check = useAnimatedStyle(() => ({ opacity: step(t.value, D, AT.friend, AT.friend + 150), transform: [{ scale: pop(t.value, D, AT.friend, AT.friend + 300) }] }));
  const sendStyle = useAnimatedStyle(() => ({ opacity: 0.4 + 0.6 * step(t.value, D, AT.friend, AT.friend + 200) }));
  const toast = useAnimatedStyle(() => {
    const p = step(t.value, D, AT.toast, AT.toast + 300) - step(t.value, D, AT.toast + 1000, AT.toast + 1300);
    return { opacity: p, transform: [{ translateY: (1 - p) * 14 }] };
  });
  const notif = useAnimatedStyle(() => {
    const p = step(t.value, D, AT.notif, AT.notif + 450) - step(t.value, D, AT.compare, AT.compare + 300);
    return { opacity: p, transform: [{ translateY: (1 - p) * -(notifH + 20) }] };
  });
  const discoverStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (step(t.value, D, AT.discover - 120, AT.discover) - step(t.value, D, AT.discover + 60, AT.discover + 220)) * 0.06 }],
  }));
  const compare = useAnimatedStyle(() => {
    const p = step(t.value, D, AT.compare, AT.compare + 500);
    return { opacity: p, transform: [{ translateY: (1 - p) * 60 }] };
  });
  const bar = useAnimatedStyle(() => ({ width: `${82 * step(t.value, D, AT.compare + 500, AT.compare + 1500)}%` }));

  return (
    <Stage width={W} height={H}>
      <View style={[styles.header, { left: pad, right: pad }]}>
        <Ionicons name="chevron-back" size={18} color={colors.text} />
        <Text numberOfLines={1} style={styles.headerTitle}>
          {tr('play.onb.createTitle')}
        </Text>
        <Animated.View style={[styles.sharePill, { width: shareW }, shareStyle]}>
          <Ionicons name="paper-plane" size={14} color="#fff" />
          <Text style={styles.sharePillText}>{tr('play.onb.share')}</Text>
        </Animated.View>
      </View>

      <View style={[styles.field, { top: fieldTop, left: pad, right: pad }]}>
        <Text style={styles.fieldLabel}>{upper(tr('play.onb.titleLabel'))}</Text>
        <View style={styles.typedRow}>
          {[...title].map((ch, i) => (
            <TypedChar key={i} t={t} at={AT.typed[0] + ((AT.typed[1] - AT.typed[0]) * i) / Math.max(1, title.length)} ch={ch} />
          ))}
          <Caret t={t} />
        </View>
      </View>

      {TIER_COLORS.slice(0, 5).map((color, i) => (
        <View key={color} style={[styles.row, { top: rowsTop + i * (rowH + 2), height: rowH }]}>
          <View style={[styles.rowLabel, { backgroundColor: color }]}>
            <Text style={styles.rowLabelText}>{'SABCD'[i]}</Text>
          </View>
        </View>
      ))}

      <View style={[styles.tray, { top: trayTop }]}>
        <Animated.Text style={[styles.trayText, count]}>{tr('play.onb.toRankTen')}</Animated.Text>
      </View>
      {FRUITS.map((name, i) => (
        <WordCard
          key={name}
          t={t}
          i={i}
          left={gridLeft + (i % 5) * (c + 6)}
          top={trayTop + 26 + Math.floor(i / 5) * (c + 6)}
          size={c}
          name={name}
          word={words[i] ?? ''}
        />
      ))}

      <Animated.View style={[styles.wand, { left: wand.x - wandSize / 2, top: wand.y - wandSize / 2, width: wandSize, height: wandSize }, wandStyle]}>
        <LinearGradient colors={['#7C5CFF', '#B45CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View style={sparkle}>
          <Ionicons name="sparkles" size={22} color="#FFE07A" />
        </Animated.View>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.veil, veil]} />
      <Animated.View style={[styles.sheet, { top: sheetTop, height: sheetH }, sheet]}>
        <Text style={styles.sheetTitle}>{tr('play.onb.sendTitle')}</Text>
        <View style={styles.friendRow}>
          <AvatarDrawing config={FRIEND} size={36} />
          <Text style={styles.friendName}>{tr('play.onb.friendName')}</Text>
          <View style={styles.checkCircle}>
            <Animated.View style={[styles.checkOn, check]}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </Animated.View>
          </View>
        </View>
        <View style={styles.friendRow}>
          <AvatarDrawing config={OTHER_FRIEND} size={36} />
          <Text style={styles.friendName}>{tr('play.onb.otherFriend')}</Text>
          <View style={styles.checkCircle} />
        </View>
        <Animated.View style={[styles.sendButton, sendStyle]}>
          <Ionicons name="paper-plane" size={15} color="#fff" />
          <Text style={styles.sharePillText}>{tr('play.onb.send')}</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.toast, { top: H * 0.42 }, toast]}>
        <Ionicons name="checkmark-circle" size={16} color="#2EAD6B" />
        <Text style={styles.toastText}>{tr('play.onb.sent')}</Text>
      </Animated.View>

      <Animated.View style={[styles.notif, { left: pad - 4, right: pad - 4, height: notifH }, notif]}>
        <View style={styles.notifHead}>
          <AvatarDrawing config={FRIEND} size={34} />
          <View style={{ flex: 1 }}>
            <Text style={styles.notifApp}>{upper('Tiercraft')}</Text>
            <Text numberOfLines={1} style={styles.notifTitle}>
              {tr('play.onb.notifTitle')}
            </Text>
          </View>
          <Text style={styles.notifEmoji}>📬</Text>
        </View>
        <Animated.View style={[styles.discover, discoverStyle]}>
          <Text style={styles.sharePillText}>{tr('play.onb.discover')}</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </Animated.View>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, styles.compare, compare]}>
        <View style={styles.duelRow}>
          <View style={styles.player}>
            <AvatarDrawing config={ME} size={58} />
            <Text style={styles.playerName}>{tr('play.onb.you')}</Text>
          </View>
          <View style={styles.vs}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={styles.player}>
            <AvatarDrawing config={FRIEND} size={58} />
            <Text style={styles.playerName}>{tr('play.onb.friendName')}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.score}>{tr('play.onb.duelScore')}</Text>
          <Text style={styles.scoreHint}>{tr('play.onb.duelHint')}</Text>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, bar]} />
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <View style={styles.legend}>
            <Text style={styles.legendText}>{tr('play.onb.you')}</Text>
            <Text style={styles.legendText}>{tr('play.onb.friendName')}</Text>
            <View style={{ width: 14 }} />
          </View>
          {COMPARED.map(([name, mine, theirs], i) => (
            <CompareRow key={name} t={t} i={i} name={name} word={words[FRUITS.indexOf(name)] ?? ''} mine={mine} theirs={theirs} />
          ))}
        </View>
      </Animated.View>

      <Finger pressed={pressed} style={fingerStyle} size={FINGER} />
    </Stage>
  );
}

function TypedChar({ t, at, ch }: { t: SharedValue<number>; at: number; ch: string }) {
  const style = useAnimatedStyle(() => ({ opacity: step(t.value, CREATE_SHARE_DURATION, at, at + 60, false) }));
  return <Animated.Text style={[styles.typed, style]}>{ch}</Animated.Text>;
}

/** The text cursor, blinking while the title is typed. */
function Caret({ t }: { t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const ms = t.value * CREATE_SHARE_DURATION;
    const on = ms < AT.typed[1] + 500 && Math.floor(ms / 400) % 2 === 0;
    return { opacity: on ? 1 : 0 };
  });
  return <Animated.View style={[styles.caret, style]} />;
}

/** Font size for a word to fit a card's width on one line (bold letters up to ≈ 0.75 em wide, Greek ones included). */
function wordSize(word: string, card: number): number {
  return Math.min(11, Math.floor(((card - 6) / Math.max(1, word.length) / 0.75) * 10) / 10);
}

/** A card written by the AI: its word first, then its image drawn over it. */
function WordCard({ t, i, left, top, size, name, word }: { t: SharedValue<number>; i: number; left: number; top: number; size: number; name: Picture; word: string }) {
  const D = CREATE_SHARE_DURATION;
  const wordAt = AT.words + i * 160;
  const imageAt = AT.images + i * 200;
  const card = useAnimatedStyle(() => ({ transform: [{ scale: pop(t.value, D, wordAt, wordAt + 350) }] }));
  const image = useAnimatedStyle(() => {
    const p = step(t.value, D, imageAt, imageAt + 350);
    return { opacity: p, transform: [{ scale: 0.4 + p * 0.6 }, { translateY: -size * 0.08 }] };
  });
  // The word moves down under the image as it comes.
  const label = useAnimatedStyle(() => {
    const p = step(t.value, D, imageAt, imageAt + 350);
    return { transform: [{ translateY: p * size * 0.33 }, { scale: 1 - p * 0.15 }] };
  });
  const glow = useAnimatedStyle(() => ({ opacity: step(t.value, D, imageAt - 150, imageAt) - step(t.value, D, imageAt + 150, imageAt + 450) }));
  return (
    <Animated.View style={[styles.abs, { left, top, width: size, height: size, borderRadius: size * 0.2, backgroundColor: FRUIT_COLORS[i] }, styles.wordCard, card]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.glow, glow]} />
      <Animated.Image source={IMAGES[name]} style={[{ width: size * 0.62, height: size * 0.62 }, image]} />
      <Animated.Text numberOfLines={1} style={[styles.word, { fontSize: wordSize(word, size) }, label]}>
        {word}
      </Animated.Text>
    </Animated.View>
  );
}

function CompareRow({ t, i, name, word, mine, theirs }: { t: SharedValue<number>; i: number; name: Picture; word: string; mine: number; theirs: number }) {
  const at = AT.compare + 900 + i * 300;
  const style = useAnimatedStyle(() => {
    const p = step(t.value, CREATE_SHARE_DURATION, at, at + 300);
    return { opacity: p, transform: [{ translateX: (1 - p) * 30 }] };
  });
  return (
    <Animated.View style={[styles.compareRow, style]}>
      <Image source={IMAGES[name]} style={{ width: 28, height: 28 }} />
      <Text style={styles.compareWord}>{word}</Text>
      {[mine, theirs].map((tier, j) => (
        <View key={j} style={styles.chipCol}>
          <View style={[styles.tierChip, { backgroundColor: TIER_COLORS[tier] }]}>
            <Text style={styles.tierChipText}>{'SABCD'[tier]}</Text>
          </View>
        </View>
      ))}
      <Ionicons name={mine === theirs ? 'heart' : 'flash'} size={14} color={mine === theirs ? '#FF7FA8' : '#FFD84A'} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  wave: { fontSize: 46 },
  brand: { color: colors.text, fontSize: 38, fontWeight: '900', letterSpacing: -1 },
  brandStrip: { flexDirection: 'row', gap: 4, height: 5 },
  stripBar: { height: 5, borderRadius: 3 },
  helloCards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 300 },
  helloSub: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  header: { position: 'absolute', top: 12, height: 30, flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '800' },
  sharePill: { height: 30, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary },
  sharePillText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  field: {
    position: 'absolute',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  typedRow: { flexDirection: 'row', alignItems: 'center', height: 22 },
  typed: { color: colors.text, fontSize: 16, fontWeight: '700' },
  caret: { width: 2, height: 18, marginLeft: 1, backgroundColor: colors.primary },
  row: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', backgroundColor: colors.surface },
  rowLabel: { width: 34, alignItems: 'center', justifyContent: 'center' },
  rowLabelText: { color: '#111', fontSize: 13, fontWeight: '900' },
  tray: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.tray, borderTopWidth: 1, borderTopColor: colors.border },
  trayText: { color: colors.text, fontSize: 12, fontWeight: '800', marginLeft: 12, marginTop: 6 },
  wordCard: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { backgroundColor: 'rgba(255,224,122,0.45)' },
  word: { position: 'absolute', left: 3, right: 3, color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  wand: {
    position: 'absolute',
    borderRadius: 23,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C5CFF',
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  veil: { backgroundColor: '#000' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingTop: 14,
    gap: 8,
  },
  sheetTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 40 },
  friendName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, overflow: 'hidden' },
  checkOn: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendButton: { height: 38, borderRadius: 12, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  toastText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  notif: {
    position: 'absolute',
    top: 10,
    borderRadius: 18,
    padding: 10,
    gap: 8,
    backgroundColor: 'rgba(42,46,58,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    zIndex: 9,
  },
  notifHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifApp: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  notifTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  notifEmoji: { fontSize: 20 },
  discover: { height: 32, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary },
  compare: { backgroundColor: colors.background, padding: 16, justifyContent: 'center', gap: 14, zIndex: 8 },
  duelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  player: { alignItems: 'center', gap: 4 },
  playerName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  vs: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  vsText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  score: { color: colors.text, fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  scoreHint: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  barTrack: { alignSelf: 'stretch', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.surface },
  barFill: { height: 10, borderRadius: 5, backgroundColor: '#2EAD6B' },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  compareWord: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 10 },
  chipCol: { width: 40, alignItems: 'center' },
  legendText: { width: 40, color: colors.textMuted, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  tierChip: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  tierChipText: { color: '#111', fontSize: 13, fontWeight: '900' },
});
