import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CARD_COLORS, type CardSize } from '../constants/theme';
import { TIER_PRESETS, DEFAULT_PRESET_KEY, tierColorAt } from '../constants/presets';
import { newId } from '../lib/id';
import { deleteCardImage, duplicateCardImage } from '../lib/images';
import type { SharedList } from '../lib/share';
import { POOL, type Card, type Tier, type TierList, type Zone } from './types';

export type Settings = {
  haptics: boolean;
  cardSize: CardSize;
  showCardLabels: boolean;
  defaultPresetKey: string;
};

type NewListInput = {
  title: string;
  tierLabels: string[];
  cardLabels?: string[];
};

type State = {
  lists: Record<string, TierList>;
  settings: Settings;

  createList: (input: NewListInput) => string;
  /** Adds a tier list received from someone else (or finds the one already imported) and returns its id. */
  importList: (shared: SharedList) => string;
  deleteList: (id: string) => void;
  duplicateList: (id: string) => string | undefined;
  renameList: (id: string, title: string) => void;
  toggleFavorite: (id: string) => void;
  markOpened: (id: string) => void;

  addTier: (listId: string, atIndex?: number) => void;
  updateTier: (listId: string, tierId: string, patch: Partial<Omit<Tier, 'id'>>) => void;
  removeTier: (listId: string, tierId: string) => void;
  moveTier: (listId: string, tierId: string, direction: -1 | 1) => void;

  addCard: (listId: string, card: Omit<Card, 'id'>) => string;
  updateCard: (listId: string, cardId: string, patch: Partial<Omit<Card, 'id'>>) => void;
  deleteCard: (listId: string, cardId: string) => void;
  moveCard: (listId: string, cardId: string, to: Zone, index?: number) => void;
  resetPlacement: (listId: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  clearAll: () => void;
};

const DEFAULT_SETTINGS: Settings = {
  haptics: true,
  cardSize: 'medium',
  showCardLabels: true,
  defaultPresetKey: DEFAULT_PRESET_KEY,
};

function buildTiers(labels: string[]): Tier[] {
  return labels.map((label, i) => ({ id: newId(), label, color: tierColorAt(i) }));
}

export function defaultTierLabels(presetKey: string): string[] {
  return (TIER_PRESETS.find((p) => p.key === presetKey) ?? TIER_PRESETS[0]).labels;
}

/** Removes `cardId` from wherever it currently is. */
function detach(list: TierList, cardId: string): Pick<TierList, 'pool' | 'placement'> {
  const placement: Record<string, string[]> = {};
  for (const [tierId, ids] of Object.entries(list.placement)) {
    placement[tierId] = ids.filter((id) => id !== cardId);
  }
  return { pool: list.pool.filter((id) => id !== cardId), placement };
}

export const useTierStore = create<State>()(
  persist(
    (set, get) => {
      /** Applies `fn` to one list and bumps its `updatedAt`. */
      const patchList = (id: string, fn: (list: TierList) => Partial<TierList>) =>
        set((state) => {
          const list = state.lists[id];
          if (!list) return state;
          return {
            lists: { ...state.lists, [id]: { ...list, ...fn(list), updatedAt: Date.now() } },
          };
        });

      return {
        lists: {},
        settings: DEFAULT_SETTINGS,

        createList: ({ title, tierLabels, cardLabels = [] }) => {
          const now = Date.now();
          const tiers = buildTiers(tierLabels.length ? tierLabels : ['S']);
          const cards: Record<string, Card> = {};
          const pool: string[] = [];
          cardLabels.forEach((label, i) => {
            const id = newId();
            cards[id] = { id, label, color: CARD_COLORS[i % 7] };
            pool.push(id);
          });
          const list: TierList = {
            id: newId(),
            title: title.trim() || 'Ma tier list',
            tiers,
            cards,
            placement: Object.fromEntries(tiers.map((t) => [t.id, []])),
            pool,
            favorite: false,
            createdAt: now,
            updatedAt: now,
            openedAt: now,
          };
          set((state) => ({ lists: { ...state.lists, [list.id]: list } }));
          return list.id;
        },

        importList: (shared) => {
          const existing = Object.values(get().lists).find((l) => l.importedFrom === shared.code);
          if (existing) return existing.id;
          const now = Date.now();
          const tiers = shared.tiers.map((t) => ({ id: newId(), label: t.label, color: t.color }));
          const cards: Record<string, Card> = {};
          const placement: Record<string, string[]> = Object.fromEntries(tiers.map((t) => [t.id, []]));
          const pool: string[] = [];
          for (const c of shared.cards) {
            const id = newId();
            cards[id] = { id, label: c.label, color: c.color };
            if (c.tier >= 0) placement[tiers[c.tier].id].push(id);
            else pool.push(id);
          }
          const list: TierList = {
            id: newId(),
            title: shared.title,
            tiers,
            cards,
            placement,
            pool,
            favorite: false,
            importedFrom: shared.code,
            createdAt: now,
            updatedAt: now,
            openedAt: now,
          };
          set((state) => ({ lists: { ...state.lists, [list.id]: list } }));
          return list.id;
        },

        deleteList: (id) => {
          const list = get().lists[id];
          if (!list) return;
          Object.values(list.cards).forEach((c) => deleteCardImage(c.imageName));
          set((state) => {
            const lists = { ...state.lists };
            delete lists[id];
            return { lists };
          });
        },

        duplicateList: (id) => {
          const source = get().lists[id];
          if (!source) return undefined;
          const now = Date.now();
          const tierIds = new Map(source.tiers.map((t) => [t.id, newId()]));
          const cardIds = new Map(Object.keys(source.cards).map((cid) => [cid, newId()]));
          const mapCard = (cid: string) => cardIds.get(cid)!;
          const copy: TierList = {
            id: newId(),
            title: `${source.title} (copie)`,
            tiers: source.tiers.map((t) => ({ ...t, id: tierIds.get(t.id)! })),
            cards: Object.fromEntries(
              Object.values(source.cards).map((c) => [
                mapCard(c.id),
                { ...c, id: mapCard(c.id), imageName: duplicateCardImage(c.imageName) },
              ]),
            ),
            placement: Object.fromEntries(
              source.tiers.map((t) => [tierIds.get(t.id)!, (source.placement[t.id] ?? []).map(mapCard)]),
            ),
            pool: source.pool.map(mapCard),
            favorite: false,
            importedFrom: undefined,
            createdAt: now,
            updatedAt: now,
            openedAt: now,
          };
          set((state) => ({ lists: { ...state.lists, [copy.id]: copy } }));
          return copy.id;
        },

        renameList: (id, title) => patchList(id, () => ({ title: title.trim() || 'Sans titre' })),

        toggleFavorite: (id) => patchList(id, (l) => ({ favorite: !l.favorite })),

        markOpened: (id) =>
          set((state) => {
            const list = state.lists[id];
            if (!list) return state;
            return { lists: { ...state.lists, [id]: { ...list, openedAt: Date.now() } } };
          }),

        addTier: (listId, atIndex) =>
          patchList(listId, (l) => {
            const index = atIndex ?? l.tiers.length;
            const tier: Tier = { id: newId(), label: 'Nouveau', color: tierColorAt(index) };
            const tiers = [...l.tiers];
            tiers.splice(index, 0, tier);
            return { tiers, placement: { ...l.placement, [tier.id]: [] } };
          }),

        updateTier: (listId, tierId, patch) =>
          patchList(listId, (l) => ({
            tiers: l.tiers.map((t) => (t.id === tierId ? { ...t, ...patch } : t)),
          })),

        removeTier: (listId, tierId) =>
          patchList(listId, (l) => {
            if (l.tiers.length <= 1) return {};
            const placement = { ...l.placement };
            const orphans = placement[tierId] ?? [];
            delete placement[tierId];
            return {
              tiers: l.tiers.filter((t) => t.id !== tierId),
              placement,
              pool: [...l.pool, ...orphans],
            };
          }),

        moveTier: (listId, tierId, direction) =>
          patchList(listId, (l) => {
            const from = l.tiers.findIndex((t) => t.id === tierId);
            const to = from + direction;
            if (from < 0 || to < 0 || to >= l.tiers.length) return {};
            const tiers = [...l.tiers];
            [tiers[from], tiers[to]] = [tiers[to], tiers[from]];
            return { tiers };
          }),

        addCard: (listId, card) => {
          const id = newId();
          patchList(listId, (l) => ({
            cards: { ...l.cards, [id]: { ...card, id } },
            pool: [...l.pool, id],
          }));
          return id;
        },

        updateCard: (listId, cardId, patch) =>
          patchList(listId, (l) => {
            const card = l.cards[cardId];
            if (!card) return {};
            if ('imageName' in patch && patch.imageName !== card.imageName) {
              deleteCardImage(card.imageName);
            }
            return { cards: { ...l.cards, [cardId]: { ...card, ...patch } } };
          }),

        deleteCard: (listId, cardId) =>
          patchList(listId, (l) => {
            deleteCardImage(l.cards[cardId]?.imageName);
            const cards = { ...l.cards };
            delete cards[cardId];
            return { cards, ...detach(l, cardId) };
          }),

        moveCard: (listId, cardId, to, index) =>
          patchList(listId, (l) => {
            if (!l.cards[cardId]) return {};
            if (to !== POOL && !l.placement[to]) return {};
            const next = detach(l, cardId);
            const target = to === POOL ? [...next.pool] : [...(next.placement[to] ?? [])];
            const at = index === undefined ? target.length : Math.max(0, Math.min(index, target.length));
            target.splice(at, 0, cardId);
            if (to === POOL) return { ...next, pool: target };
            return { ...next, placement: { ...next.placement, [to]: target } };
          }),

        resetPlacement: (listId) =>
          patchList(listId, (l) => ({
            pool: [...l.tiers.flatMap((t) => l.placement[t.id] ?? []), ...l.pool],
            placement: Object.fromEntries(l.tiers.map((t) => [t.id, []])),
          })),

        updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

        clearAll: () => {
          Object.values(get().lists).forEach((l) =>
            Object.values(l.cards).forEach((c) => deleteCardImage(c.imageName)),
          );
          set({ lists: {} });
        },
      };
    },
    {
      name: 'tiercraft-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ lists: state.lists, settings: state.settings }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          lists: p.lists ?? current.lists,
          settings: { ...DEFAULT_SETTINGS, ...p.settings },
        };
      },
    },
  ),
);

const subscribeHydration = (onChange: () => void) => useTierStore.persist.onFinishHydration(onChange);
const getHydrated = () => useTierStore.persist.hasHydrated();

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, getHydrated, getHydrated);
}
