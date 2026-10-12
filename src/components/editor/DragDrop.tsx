import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useScrollOffset,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Card, Zone } from '../../store/types';
import { CardView } from '../CardView';

type Rect = { x: number; y: number; w: number; h: number };
type ZoneRect = Rect & { id: Zone; scrolls: boolean };
type CardRect = Rect & { id: string; zone: Zone; scrolls: boolean };

type Registered = { ref: RefObject<View | null>; scrolls: boolean; zone?: Zone };

const EDGE = 70;
const MAX_SPEED = 14;

type DragContextValue = {
  scrollRef: ReturnType<typeof useAnimatedRef<Animated.ScrollView>>;
  hoverZone: SharedValue<string>;
  draggingId: string | null;
  cardSize: number;
  showLabels: boolean;
  registerZone: (id: Zone, ref: RefObject<View | null>, scrolls: boolean) => () => void;
  registerCard: (id: string, zone: Zone, ref: RefObject<View | null>, scrolls: boolean) => () => void;
  /** Viewport of the vertical tier scroller, used for auto-scroll. */
  viewportRef: RefObject<View | null>;
  onScrollLayout: (viewportHeight: number) => void;
  onContentSize: (height: number) => void;
  begin: (card: Card) => void;
  drop: (cardId: string, x: number, y: number, success: boolean) => void;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  active: SharedValue<boolean>;
};

const DragContext = createContext<DragContextValue | null>(null);

function useDrag(): DragContextValue {
  const ctx = useContext(DragContext);
  if (!ctx) throw new Error('useDrag must be used inside DragProvider');
  return ctx;
}

function measure(ref: RefObject<View | null>): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, w, h) => resolve(w || h ? { x, y, w, h } : null));
  });
}

function contains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** Index at which a card dropped at (x, y) lands in a wrapped row of cards. */
function insertionIndex(cards: CardRect[], x: number, y: number): number {
  const sorted = [...cards].sort((a, b) => (Math.abs(a.y - b.y) > 4 ? a.y - b.y : a.x - b.x));
  const index = sorted.findIndex((c) => y < c.y || (y <= c.y + c.h && x < c.x + c.w / 2));
  return index === -1 ? sorted.length : index;
}

type ProviderProps = {
  children: ReactNode;
  cardSize: number;
  showLabels: boolean;
  haptics: boolean;
  onMove: (cardId: string, zone: Zone, index: number) => void;
};

export function DragProvider({ children, cardSize, showLabels, haptics, onMove }: ProviderProps) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);
  const rootRef = useRef<View>(null);
  const viewportRef = useRef<View>(null);

  const zones = useRef(new Map<Zone, Registered>());
  const cards = useRef(new Map<string, Registered>());
  const measured = useRef<{ zones: ZoneRect[]; cards: CardRect[]; scrollAt: number }>({ zones: [], cards: [], scrollAt: 0 });

  const [dragging, setDragging] = useState<Card | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const active = useSharedValue(false);
  const rootOffset = useSharedValue({ x: 0, y: 0 });
  const zoneRects = useSharedValue<ZoneRect[]>([]);
  const scrollAtMeasure = useSharedValue(0);
  const viewport = useSharedValue({ top: 0, bottom: 0 });
  const viewportHeight = useSharedValue(0);
  const contentHeight = useSharedValue(0);

  const registerZone = useCallback((id: Zone, ref: RefObject<View | null>, scrolls: boolean) => {
    zones.current.set(id, { ref, scrolls });
    return () => {
      if (zones.current.get(id)?.ref === ref) zones.current.delete(id);
    };
  }, []);

  const registerCard = useCallback((id: string, zone: Zone, ref: RefObject<View | null>, scrolls: boolean) => {
    cards.current.set(id, { ref, scrolls, zone });
    return () => {
      if (cards.current.get(id)?.ref === ref) cards.current.delete(id);
    };
  }, []);

  const measureAll = useCallback(async () => {
    const [root, vp, zoneList, cardList] = await Promise.all([
      measure(rootRef),
      measure(viewportRef),
      Promise.all(
        [...zones.current.entries()].map(async ([id, z]) => {
          const r = await measure(z.ref);
          return r ? { ...r, id, scrolls: z.scrolls } : null;
        }),
      ),
      Promise.all(
        [...cards.current.entries()].map(async ([id, c]) => {
          const r = await measure(c.ref);
          return r ? { ...r, id, zone: c.zone!, scrolls: c.scrolls } : null;
        }),
      ),
    ]);
    const scrollAt = scrollOffset.value;
    measured.current = {
      zones: zoneList.filter((z): z is ZoneRect => z !== null),
      cards: cardList.filter((c): c is CardRect => c !== null),
      scrollAt,
    };
    rootOffset.set({ x: root?.x ?? 0, y: root?.y ?? 0 });
    zoneRects.set(measured.current.zones);
    scrollAtMeasure.set(scrollAt);
    if (vp) viewport.set({ top: vp.y, bottom: vp.y + vp.h });
  }, [rootOffset, scrollAtMeasure, scrollOffset, viewport, zoneRects]);

  const autoScroll = useFrameCallback(() => {
    if (!active.value) return;
    const { top, bottom } = viewport.value;
    const y = dragY.value;
    let speed = 0;
    if (y < top + EDGE && y > top - EDGE) speed = -MAX_SPEED * Math.min(1, (top + EDGE - y) / EDGE);
    // Only inside the viewport: the tray sits right below it.
    else if (y > bottom - EDGE && y <= bottom) speed = MAX_SPEED * Math.min(1, (y - (bottom - EDGE)) / EDGE);
    if (speed === 0) return;
    const max = Math.max(0, contentHeight.value - viewportHeight.value);
    const next = Math.max(0, Math.min(max, scrollOffset.value + speed));
    if (next !== scrollOffset.value) scrollTo(scrollRef, 0, next, false);
  }, false);

  const hoverZone = useDerivedValue(() => {
    if (!active.value) return '';
    const delta = scrollOffset.value - scrollAtMeasure.value;
    const x = dragX.value;
    const y = dragY.value;
    const { top, bottom } = viewport.value;
    for (const z of zoneRects.value) {
      // A tier hidden under the tray or the header must not catch the drop.
      if (z.scrolls && (y < top || y > bottom)) continue;
      const zy = z.scrolls ? z.y - delta : z.y;
      if (x >= z.x && x <= z.x + z.w && y >= zy && y <= zy + z.h) return z.id;
    }
    return '';
  });

  const begin = useCallback(
    (card: Card) => {
      setDragging(card);
      autoScroll.setActive(true);
      if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      measureAll();
    },
    [autoScroll, haptics, measureAll],
  );

  const drop = useCallback(
    (cardId: string, x: number, y: number, success: boolean) => {
      active.set(false);
      autoScroll.setActive(false);
      setDragging(null);
      if (!success) return;
      const m = measured.current;
      const delta = scrollOffset.value - m.scrollAt;
      const shift = <T extends Rect & { scrolls: boolean }>(r: T): T => (r.scrolls ? { ...r, y: r.y - delta } : r);
      const vpTop = viewport.value.top;
      const vpBottom = viewport.value.bottom;
      const zone = m.zones
        .map(shift)
        .find((z) => (!z.scrolls || (y >= vpTop && y <= vpBottom)) && contains(z, x, y));
      if (!zone) return;
      const siblings = m.cards.filter((c) => c.zone === zone.id && c.id !== cardId).map(shift);
      onMove(cardId, zone.id, insertionIndex(siblings, x, y));
      if (haptics) Haptics.selectionAsync().catch(() => {});
    },
    [active, autoScroll, haptics, onMove, scrollOffset, viewport],
  );

  const value = useMemo<DragContextValue>(
    () => ({
      scrollRef,
      hoverZone,
      draggingId: dragging?.id ?? null,
      cardSize,
      showLabels,
      registerZone,
      registerCard,
      viewportRef,
      onScrollLayout: (h) => {
        viewportHeight.set(h);
      },
      onContentSize: (h) => {
        contentHeight.set(h);
      },
      begin,
      drop,
      dragX,
      dragY,
      active,
    }),
    [scrollRef, hoverZone, dragging, cardSize, showLabels, registerZone, registerCard, begin, drop, dragX, dragY, active, viewportHeight, contentHeight],
  );

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value - rootOffset.value.x - cardSize / 2 },
      { translateY: dragY.value - rootOffset.value.y - cardSize / 2 },
      { scale: withSpring(active.value ? 1.12 : 1) },
    ],
  }));

  return (
    <DragContext.Provider value={value}>
      <View ref={rootRef} collapsable={false} style={{ flex: 1 }}>
        {children}
        {dragging ? (
          <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]}>
            <View style={styles.shadow}>
              <CardView card={dragging} size={cardSize} showLabel={showLabels} />
            </View>
          </Animated.View>
        ) : null}
      </View>
    </DragContext.Provider>
  );
}

/** Registers a view as a drop target. */
export function useDropZone(id: Zone, scrolls: boolean) {
  const { registerZone, hoverZone } = useDrag();
  const ref = useRef<View>(null);
  useEffect(() => registerZone(id, ref, scrolls), [id, registerZone, scrolls]);
  const highlight = useAnimatedStyle(() => ({
    backgroundColor: hoverZone.value === id ? 'rgba(124,92,255,0.18)' : 'transparent',
  }));
  return { ref, highlight };
}

type DraggableProps = {
  card: Card;
  zone: Zone;
  scrolls: boolean;
  onPress: (card: Card) => void;
};

export function DraggableCard({ card, zone, scrolls, onPress }: DraggableProps) {
  const { registerCard, begin, drop, dragX, dragY, active, draggingId, cardSize, showLabels } = useDrag();
  const ref = useRef<View>(null);
  useEffect(() => registerCard(card.id, zone, ref, scrolls), [card.id, zone, registerCard, scrolls]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(220)
      .onStart((e) => {
        dragX.set(e.absoluteX);
        dragY.set(e.absoluteY);
        active.set(true);
        scheduleOnRN(begin, card);
      })
      .onUpdate((e) => {
        dragX.set(e.absoluteX);
        dragY.set(e.absoluteY);
      })
      .onEnd((e, success) => {
        scheduleOnRN(drop, card.id, e.absoluteX, e.absoluteY, success);
      });
    const tap = Gesture.Tap()
      .maxDuration(400)
      .runOnJS(true)
      .onEnd((_e, success) => {
        if (success) onPress(card);
      });
    return Gesture.Exclusive(pan, tap);
  }, [active, begin, card, drop, dragX, dragY, onPress]);

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={ref}
        collapsable={false}
        accessible
        accessibilityRole="button"
        accessibilityLabel={card.label || 'Carte'}
        accessibilityHint="Touchez pour modifier ou déplacer, maintenez pour glisser"
        style={{ opacity: draggingId === card.id ? 0.25 : 1 }}
      >
        <CardView card={card} size={cardSize} showLabel={showLabels} />
      </View>
    </GestureDetector>
  );
}

export function useDragContext() {
  return useDrag();
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, top: 0, zIndex: 100 },
  shadow: {
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
});
