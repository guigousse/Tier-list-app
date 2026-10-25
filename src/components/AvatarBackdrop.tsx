import { memo, useEffect, useId, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import type { Background, BackgroundFx } from '../lib/avatar';

/**
 * The background of a premium avatar, alive: flames, lightning, an aurora… Layers of
 * still drawings moved by their position, size or opacity only, so it all runs on the
 * UI thread. `animated: false` (small avatars, reduced motion): the first frame, still.
 * Drawings use a 100 × 100 box stretched to the avatar's size.
 */
export const AvatarBackdrop = memo(function AvatarBackdrop({ bg, size, animated }: { bg: Background; size: number; animated: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduceMotion = useReducedMotion();
  const play = animated && !reduceMotion;
  const base = useMemo(() => baseSvg(bg, uid), [bg, uid]);
  const Fx = bg.fx ? FX[bg.fx] : null;
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: 'hidden' }]} pointerEvents="none">
      <SvgXml xml={base} width={size} height={size} />
      {Fx ? <Fx size={size} play={play} uid={uid} /> : null}
    </View>
  );
});

type FxProps = { size: number; play: boolean; uid: string };

// ——— motion ———

/**
 * 0 → 1 over `duration`, again and again (back and forth when `swing`), from `delay`,
 * with `pause` ms at 0 between two runs. Stays at `rest` when not playing.
 */
function useLoop(play: boolean, duration: number, { delay = 0, swing = false, pause = 0, rest = 0, ease = Easing.inOut(Easing.sin) } = {}): SharedValue<number> {
  const t = useSharedValue(rest);
  useEffect(() => {
    if (!play) {
      t.value = rest;
      return;
    }
    t.value = 0;
    const run = withTiming(1, { duration, easing: ease });
    const cycle = swing
      ? withRepeat(run, -1, true)
      : withRepeat(pause ? withSequence(run, withTiming(0, { duration: 0 }), withTiming(0, { duration: pause })) : withSequence(run, withTiming(0, { duration: 0 })), -1);
    t.value = withDelay(delay, cycle);
  }, [play, duration, delay, swing, pause, rest, ease, t]);
  return t;
}

/** A drawing over the whole avatar (or `box`: x, y, width, height in the 100 box). */
function Layer({ xml, size, style, box }: { xml: string; size: number; style?: object; box?: [number, number, number, number] }) {
  const [x, y, w, h] = box ?? [0, 0, 100, 100];
  const k = size / 100;
  // Gradient ids of its own: on the web, every avatar of every screen shares one page.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const own = useMemo(() => xml.replace(/id="(\w+)"/g, `id="$1${uid}"`).replace(/url\(#(\w+)\)/g, `url(#$1${uid})`), [xml, uid]);
  return (
    <Animated.View style={[{ position: 'absolute', left: x * k, top: y * k, width: w * k, height: h * k }, style]}>
      <SvgXml xml={own} width={w * k} height={h * k} />
    </Animated.View>
  );
}

function Wobble({ xml, size, play, duration, delay = 0, dx = 1.5, stretch = 0.1, box }: FxProps & { xml: string; duration: number; delay?: number; dx?: number; stretch?: number; box?: [number, number, number, number] }) {
  const t = useLoop(play, duration, { delay, swing: true, rest: 0.5 });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: (t.value - 0.5) * 2 * dx * (size / 100) }, { scaleY: 1 - stretch / 2 + t.value * stretch }],
  }));
  return <Layer xml={xml} size={size} box={box} style={[{ transformOrigin: 'bottom' }, style]} />;
}

function Rise({ xml, size, play, duration, delay, distance, box }: FxProps & { xml: string; duration: number; delay: number; distance: number; box: [number, number, number, number] }) {
  const t = useLoop(play, duration, { delay, rest: 0.35, ease: Easing.out(Easing.quad) });
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.15 ? t.value / 0.15 : 1 - (t.value - 0.15) / 0.85,
    transform: [{ translateY: -t.value * distance * (size / 100) }, { translateX: Math.sin(t.value * 6) * 1.5 * (size / 100) }],
  }));
  return <Layer xml={xml} size={size} box={box} style={style} />;
}

function Twinkle({ xml, size, play, duration, delay = 0, min = 0.15, scale = 0, box }: FxProps & { xml: string; duration: number; delay?: number; min?: number; scale?: number; box?: [number, number, number, number] }) {
  const t = useLoop(play, duration, { delay, swing: true, rest: 1 });
  const style = useAnimatedStyle(() => ({ opacity: min + (1 - min) * t.value, transform: [{ scale: 1 - scale + scale * t.value }] }));
  return <Layer xml={xml} size={size} box={box} style={style} />;
}

function Spin({ xml, size, play, duration, reverse = false }: FxProps & { xml: string; duration: number; reverse?: boolean }) {
  const t = useLoop(play, duration, { ease: Easing.linear });
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${(reverse ? -1 : 1) * t.value * 360}deg` }] }));
  return <Layer xml={xml} size={size} style={style} />;
}

function Drift({ xml, size, play, duration, delay = 0, dx, box }: FxProps & { xml: string; duration: number; delay?: number; dx: number; box: [number, number, number, number] }) {
  const t = useLoop(play, duration, { delay, swing: true, rest: 0.5 });
  const style = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * Math.sin(t.value * Math.PI), transform: [{ translateX: (t.value - 0.5) * 2 * dx * (size / 100) }] }));
  return <Layer xml={xml} size={size} box={box} style={style} />;
}

/** A lightning strike: a double flash, then nothing for the rest of `period`. */
function Strike({ xml, size, play, period, delay, rest = 0 }: FxProps & { xml: string; period: number; delay: number; rest?: number }) {
  const t = useSharedValue(rest);
  useEffect(() => {
    if (!play) {
      t.value = rest;
      return;
    }
    t.value = 0;
    const flash = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(0.25, { duration: 70 }),
      withTiming(1, { duration: 50 }),
      withTiming(0, { duration: 260 }),
      withTiming(0, { duration: period - 430 }),
    );
    t.value = withDelay(delay, withRepeat(flash, -1));
  }, [play, period, delay, rest, t]);
  const style = useAnimatedStyle(() => ({ opacity: t.value }));
  return <Layer xml={xml} size={size} style={style} />;
}

/** A band of light crossing the avatar now and then. */
function Sweep({ xml, size, play, period }: FxProps & { xml: string; period: number }) {
  const t = useLoop(play, 900, { pause: period - 900, ease: Easing.inOut(Easing.quad), rest: 0 });
  const style = useAnimatedStyle(() => ({ opacity: play ? 1 : 0, transform: [{ translateX: (t.value * 2.4 - 1.2) * size }] }));
  return <Layer xml={xml} size={size} style={style} />;
}

// ——— drawings ———

const svg = (body: string, viewBox = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="none">${body}</svg>`;

/** The still part: the gradient, its glow, and what never moves. */
function baseSvg(bg: Background, uid: string): string {
  const stops = bg.stops.map((s, i) => `<stop offset="${i / (bg.stops.length - 1)}" stop-color="${s}"/>`).join('');
  const extra: Partial<Record<BackgroundFx, string>> = {
    storm: `<g fill="#0A0D24" opacity=".55"><ellipse cx="20" cy="8" rx="30" ry="12"/><ellipse cx="62" cy="4" rx="34" ry="12"/><ellipse cx="96" cy="12" rx="22" ry="10"/></g>`,
    psyche: '',
    aurora: STARS(0.7),
    sparkle: `<g stroke="#FFFFFF" stroke-width=".5" opacity=".35" fill="none"><path d="M0 30 L30 0 M0 70 L70 0 M30 100 L100 30 M70 100 L100 70 M0 0 L100 100"/></g>`,
  };
  return svg(`<defs><linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
<radialGradient id="l${uid}" cx=".5" cy=".42" r=".5"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".3"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient></defs>
<rect width="100" height="100" fill="url(#g${uid})"/><circle cx="50" cy="44" r="40" fill="url(#l${uid})"/>${bg.fx ? extra[bg.fx] ?? '' : ''}`);
}

const STARS = (o: number, list: number[][] = [[14, 18, 0.9], [84, 14, 1.2], [92, 44, 0.7], [8, 50, 1], [22, 82, 0.7], [90, 78, 0.9], [66, 8, 0.7]]) =>
  `<g fill="#FFFFFF" opacity="${o}">${list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;

/** A row of flame tongues rising from the bottom, taller on the sides. */
function flames(color: string, tip: string, seed: number, height: number, opacity: number): string {
  let d = 'M-4 100 ';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x0 = -4 + (108 / n) * i, x1 = x0 + 108 / n;
    const side = Math.abs((x0 + x1) / 2 - 50) / 50;
    const h = height * (0.45 + 0.55 * side) * (0.85 + 0.3 * Math.abs(Math.sin(seed + i * 1.7)));
    const tipX = (x0 + x1) / 2 + Math.sin(seed * 3 + i) * 3;
    d += `L${x0.toFixed(1)} 100 Q${(x0 + 1).toFixed(1)} ${(100 - h * 0.55).toFixed(1)} ${tipX.toFixed(1)} ${(100 - h).toFixed(1)} Q${(x1 - 1).toFixed(1)} ${(100 - h * 0.55).toFixed(1)} ${x1.toFixed(1)} 100 `;
  }
  return svg(`<defs><linearGradient id="f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${tip}"/></linearGradient></defs><path d="${d}L104 100 Z" fill="url(#f)" opacity="${opacity}"/>`);
}

const EMBER = svg('<circle cx="50" cy="50" r="30" fill="#FFE08A"/><circle cx="50" cy="50" r="50" fill="#FFB347" opacity=".35"/>');

/** A lightning bolt from the top edge. */
function bolt(points: number[][], width = 1.4): string {
  const d = 'M' + points.map(([x, y]) => `${x} ${y}`).join(' L');
  return svg(`<path d="${d}" fill="none" stroke="#7FB8FF" stroke-width="${width * 4}" stroke-linejoin="round" opacity=".35"/><path d="${d}" fill="none" stroke="#EAF4FF" stroke-width="${width}" stroke-linejoin="round"/>`);
}

const FLASH = svg('<rect width="100" height="100" fill="#CFE2FF" opacity=".22"/>');

/** A rosette of coloured petals; its square always covers the round avatar as it turns. */
const ROSETTE = (() => {
  const colors = ['#FF6FD8', '#8B6CFF', '#3EE0C8', '#FFC86B'];
  const n = 16;
  let s = '';
  for (let i = 0; i < n; i++) {
    const a0 = (Math.PI * 2 * i) / n, a1 = (Math.PI * 2 * (i + 1)) / n;
    const p = (a: number, r: number) => `${(50 + Math.cos(a) * r).toFixed(2)} ${(50 + Math.sin(a) * r).toFixed(2)}`;
    // Petals curving round the centre: a swirl rather than flat wedges.
    s += `<path d="M50 50 Q${p(a0 + 0.5, 40)} ${p(a0, 75)} A75 75 0 0 1 ${p(a1, 75)} Q${p(a1 + 0.5, 40)} 50 50 Z" fill="${colors[i % colors.length]}" opacity=".8"/>`;
  }
  return svg(`${s}<g fill="none" stroke="#FFFFFF" opacity=".22">${[12, 22, 32, 42].map((r) => `<circle cx="50" cy="50" r="${r}" stroke-width="${r / 12}"/>`).join('')}</g>`);
})();
const RINGS = svg(`<g fill="none" stroke="#1B0F3A" opacity=".22">${[8, 17, 26, 35, 44].map((r) => `<circle cx="50" cy="50" r="${r}" stroke-width="3"/>`).join('')}</g>`);
const HUSH = svg('<defs><radialGradient id="h" cx=".5" cy=".45" r=".5"><stop offset="0" stop-color="#2A1550" stop-opacity=".55"/><stop offset=".75" stop-color="#2A1550" stop-opacity="0"/></radialGradient></defs><rect width="100" height="100" fill="url(#h)"/>');

/** A ribbon of aurora, wider than the avatar so it can drift. */
function ribbon(color: string, y: number, flip: boolean): string {
  const w = (a: number, b: number) => (flip ? b : a);
  const d = `M0 ${y + w(8, -6)} C30 ${y - 10} 50 ${y + w(16, 4)} 80 ${y} C110 ${y - 14} 120 ${y + 10} 140 ${y - 4} L140 ${y + 18} C120 ${y + 30} 110 ${y + 8} 80 ${y + 22} C50 ${y + w(36, 26)} 30 ${y + 12} 0 ${y + w(30, 20)} Z`;
  return svg(
    `<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset=".45" stop-color="${color}" stop-opacity=".9"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${d}" fill="url(#a)"/>`,
    '0 0 140 100',
  );
}

/** Soft clouds of colour (radial gradients: no blur filter on every platform). */
const NEBULA = svg(
  `<defs>${[['p', '#B06CFF'], ['r', '#FF6FB5'], ['b', '#6FA8FF']].map(([k, c]) => `<radialGradient id="${k}"><stop offset="0" stop-color="${c}" stop-opacity=".6"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}</defs>` +
    '<ellipse cx="28" cy="34" rx="34" ry="18" fill="url(#p)" transform="rotate(-25 28 34)"/><ellipse cx="74" cy="70" rx="32" ry="16" fill="url(#r)" transform="rotate(20 74 70)"/><ellipse cx="62" cy="26" rx="22" ry="11" fill="url(#b)"/>',
);
const STAR_GROUPS = [
  [[14, 18, 1], [66, 8, 0.8], [22, 82, 0.8]],
  [[84, 14, 1.3], [8, 50, 1.1], [50, 92, 0.7]],
  [[92, 44, 0.8], [90, 78, 1], [36, 6, 0.7], [76, 92, 0.8]],
].map((g) => svg(STARS(1, g)));

const GLINT = svg('<path d="M50 0 C53 40 60 47 100 50 C60 53 53 60 50 100 C47 60 40 53 0 50 C40 47 47 40 50 0 Z" fill="#FFFFFF"/>');
const SHINE = svg('<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".5" stop-color="#FFFFFF" stop-opacity=".55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs><path d="M30 -10 L52 -10 L22 110 L0 110 Z" fill="url(#s)"/>');

// ——— the effects ———

const FX: Record<BackgroundFx, (p: FxProps) => ReactNode> = {
  flames: (p) => (
    <>
      <Wobble {...p} xml={flames('#7A0F0F', '#E2462B', 1, 70, 0.95)} duration={1300} dx={2} />
      <Wobble {...p} xml={flames('#E2462B', '#FF9F1C', 2.3, 56, 0.95)} duration={900} delay={200} dx={-2.5} stretch={0.14} />
      <Wobble {...p} xml={flames('#FF9F1C', '#FFE08A', 4.1, 38, 0.9)} duration={650} delay={100} dx={1.5} stretch={0.18} />
      {[12, 30, 72, 88, 20, 80].map((x, i) => (
        <Rise key={i} {...p} xml={EMBER} duration={2200 + i * 260} delay={i * 380} distance={70} box={[x - 1.2, 88, 2.4, 2.4]} />
      ))}
    </>
  ),
  storm: (p) => (
    <>
      <Strike {...p} xml={FLASH} period={3400} delay={600} />
      <Strike {...p} xml={bolt([[18, 0], [12, 20], [20, 23], [9, 46], [15, 48], [6, 68]])} period={3400} delay={600} rest={1} />
      <Strike {...p} xml={bolt([[86, 0], [91, 16], [83, 19], [93, 40], [86, 42], [95, 60]], 1.2)} period={4300} delay={1900} />
      <Strike {...p} xml={bolt([[52, 0], [47, 10], [55, 12], [49, 24]], 1)} period={5200} delay={3100} />
    </>
  ),
  psyche: (p) => (
    <>
      <Spin {...p} xml={ROSETTE} duration={14000} />
      <Twinkle {...p} xml={RINGS} duration={1600} min={0.4} scale={0.12} />
      <Layer xml={HUSH} size={p.size} />
    </>
  ),
  aurora: (p) => (
    <>
      <Drift {...p} xml={ribbon('#5CF2B0', 14, false)} duration={5200} dx={12} box={[-20, 0, 140, 100]} />
      <Drift {...p} xml={ribbon('#4FC3F7', 26, true)} duration={7000} delay={600} dx={-14} box={[-20, 0, 140, 100]} />
      <Drift {...p} xml={ribbon('#B388FF', 6, true)} duration={8600} delay={1200} dx={10} box={[-20, 0, 140, 100]} />
    </>
  ),
  stars: (p) => (
    <>
      <Spin {...p} xml={NEBULA} duration={40000} />
      {STAR_GROUPS.map((xml, i) => (
        <Twinkle key={i} {...p} xml={xml} duration={900 + i * 450} delay={i * 300} />
      ))}
    </>
  ),
  sparkle: (p) => (
    <>
      {[[16, 22, 16], [82, 18, 12], [87, 62, 18], [12, 62, 11], [50, 6, 9]].map(([x, y, s], i) => (
        <Twinkle key={i} {...p} xml={GLINT} duration={700 + i * 230} delay={i * 350} min={0} scale={0.9} box={[x - s / 2, y - s / 2, s, s]} />
      ))}
      <Sweep {...p} xml={SHINE} period={3600} />
    </>
  ),
};
