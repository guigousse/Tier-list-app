import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CARD_COLORS, type CardSize } from '../constants/theme';
import { CLASSIC_TIERS, tierColorAt, type Template } from '../constants/presets';
import { newId } from '../lib/id';
import { deleteCardImage, duplicateCardImage } from '../lib/images';
import type { DailyList } from '../lib/api';
import type { SharedList } from '../lib/share';
import { POOL, type Card, type Tier, type TierList, type Zone } from './types';

/** The player's social profile. `secret` proves it is theirs to the server; never shown. */
export type Profile = { id: string; secret: string; pseudo: string; tag: number; avatar: string };

export type Settings = {
  haptics: boolean;
  /** Click sound on buttons. */
  sounds: boolean;
  /** Daily local notification announcing the daily tier list, at `reminderHour`:00. */
  dailyReminder: boolean;
  reminderHour: number;
  /** Push notifications about friends: lists received, lists ranked, friends' rankings. */
  friendNotifications: boolean;
  /** Whether the reminder was already offered (after the first daily validation). */
  reminderAsked: boolean;
  /** Whether the welcome screens were seen. */
  onboarded: boolean;
  cardSize: CardSize;
  showCardLabels: boolean;
};

type NewListInput = {
  title: string;
  tierLabels: string[];
  cardLabels?: string[];
  /** Per card label: tier index it starts in (-1 or missing: unranked). */
  cardRanks?: number[];
  /** Where the list comes from (e.g. "daily:2026-10-13"), to find it again instead of duplicating it. */
  importedFrom?: string;
  emoji?: string;
};

type State = {
  lists: Record<string, TierList>;
  settings: Settings;
  /** Anonymous id of this install, sent with daily votes (one vote per device and day). */
  deviceId: string;
  /** Keys of the popular tier lists this device marked as favourite. */
  favoriteTemplates: string[];
  /** This player's social profile, once created. */
  profile: Profile | null;
  /** Received tier lists whose final comparison the player opened (they go to the archive). */
  viewedMail: string[];
  /** Badge chosen at each fork of the reward path (fork id → badge id), for good. */
  badgeChoices: Record<string, string>;
  /** Badges shown on the profile, up to 3. */
  shownBadges: string[];

  createList: (input: NewListInput) => string;
  /** Adds a tier list received from someone else (or finds the one already imported) and returns its id. */
  importList: (shared: SharedList) => string;
  /** The tier list a friend sent, to rank (created the first time; `again`: to rank it once more). */
  receiveMail: (mail: { id: string; from: string; list: SharedList }, again?: boolean) => string;
  /** Marks a received list as ranked and sent back. */
  markMailAnswered: (listId: string) => void;
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

  /** Creates the local copy of a daily tier list: classic S→D tiers, fixed cards. */
  createDailyList: (daily: DailyList) => string;
  /** Freezes the ranking of a daily tier list once every card is placed. */
  validateDaily: (listId: string) => boolean;
  /** Creates the local copy of a popular tier list: classic S→D tiers, fixed cards. */
  createPopularList: (template: Template) => string;
  /** Records the current ranking of a popular tier list as validated (can be done again). */
  validatePopular: (listId: string) => boolean;
  markVoteSent: (listId: string) => void;
  toggleTemplateFavorite: (key: string) => boolean;
  setProfile: (profile: Profile | null) => void;
  markMailViewed: (mailId: string) => void;
};

const DEFAULT_SETTINGS: Settings = {
  haptics: true,
  sounds: true,
  dailyReminder: false,
  reminderHour: 18,
  friendNotifications: true,
  reminderAsked: false,
  onboarded: false,
  cardSize: 'medium',
  showCardLabels: true,
};

/** Tier index (0 = S …) of each card of `cardIds`, or null if one isn't ranked. */
export function rankingOf(list: TierList, cardIds: string[]): number[] | null {
  const tierOf = new Map<string, number>();
  list.tiers.forEach((t, i) => (list.placement[t.id] ?? []).forEach((id) => tierOf.set(id, i)));
  const ranks = cardIds.map((id) => tierOf.get(id));
  return ranks.every((r) => r !== undefined) ? (ranks as number[]) : null;
}

/** Statistics key of a popular list: its template key and a hash of its cards. */
export function popularVoteKey(template: Template): string {
  let h = 5381;
  for (const ch of template.items.join('\n')) h = ((h * 33) ^ ch.codePointAt(0)!) >>> 0;
  return `popular:${template.key}:${h.toString(36)}`;
}

function buildTiers(labels: string[]): Tier[] {
  return labels.map((label, i) => ({ id: newId(), label, color: tierColorAt(i) }));
}

/** Removes `cardId` from wherever it currently is. */
function detach(list: TierList, cardId: string): Pick<TierList, 'pool' | 'placement'> {
  const placement: Record<string, string[]> = {};
  for (const [tierId, ids] of Object.entries(list.placement)) {
    placement[tierId] = ids.filter((id) => id !== cardId);
  }
  return { pool: list.pool.filter((id) => id !== cardId), placement };
}

type Persisted = {
  lists?: Record<string, TierList>;
  settings?: Partial<Settings> & { defaultPresetKey?: string };
  deviceId?: string;
  favoriteTemplates?: string[];
  profile?: Profile | null;
  viewedMail?: string[];
  badgeChoices?: Record<string, string>;
  shownBadges?: string[];
};

/** Upgrades data saved by an older version of the app (see `version` below). */
export function migrateStore(persisted: unknown, version: number): Persisted {
  const data = (persisted ?? {}) as Persisted;
  if (version < 2) {
    // v2: tier presets were removed from the settings.
    if (data.settings) delete data.settings.defaultPresetKey;
  }
  if (version < 3) {
    // v3: welcome screens. People who already made tier lists don't need them.
    data.settings = { ...data.settings, onboarded: Object.keys(data.lists ?? {}).length > 0 };
  }
  return data;
}

const STORE_KEY = 'tiercraft-store';

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
        deviceId: newId(),
        favoriteTemplates: [],
        profile: null,
        viewedMail: [],
        badgeChoices: {},
        shownBadges: [],

        createList: ({ title, tierLabels, cardLabels = [], cardRanks = [], importedFrom, emoji }) => {
          const now = Date.now();
          const tiers = buildTiers(tierLabels.length ? tierLabels : ['S']);
          const cards: Record<string, Card> = {};
          const pool: string[] = [];
          const placement: Record<string, string[]> = Object.fromEntries(tiers.map((t) => [t.id, []]));
          cardLabels.forEach((label, i) => {
            const id = newId();
            cards[id] = { id, label, color: CARD_COLORS[i % 7] };
            const tier = tiers[cardRanks[i] ?? -1];
            if (tier) placement[tier.id].push(id);
            else pool.push(id);
          });
          const list: TierList = {
            id: newId(),
            title: title.trim() || 'Ma tier list',
            tiers,
            cards,
            placement,
            pool,
            favorite: false,
            importedFrom,
            emoji,
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

        receiveMail: ({ id, from, list: shared }, again) => {
          const existing = Object.values(get().lists).find((l) => l.mail?.id === id);
          if (existing) {
            // Ranked again: the earlier ranking stays in place, to adjust.
            if (again) patchList(existing.id, (l) => ({ mail: { ...l.mail!, answeredAt: undefined } }));
            return existing.id;
          }
          // Cards to rank: the sender's ranking isn't shown.
          const listId = get().importList({ ...shared, code: `mail:${id}`, cards: shared.cards.map((c) => ({ ...c, tier: -1 })) });
          // importList creates the cards in the order sent.
          patchList(listId, (l) => ({ mail: { id, from, cardIds: [...l.pool] } }));
          return listId;
        },

        markMailAnswered: (listId) => patchList(listId, (l) => (l.mail ? { mail: { ...l.mail, answeredAt: Date.now() } } : {})),

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

        createDailyList: (daily) => {
          const now = Date.now();
          const tiers = buildTiers(CLASSIC_TIERS);
          const cards: Record<string, Card> = {};
          const cardIds = daily.items.map((label, i) => {
            const id = newId();
            cards[id] = { id, label, color: CARD_COLORS[i % 7] };
            return id;
          });
          const list: TierList = {
            id: newId(),
            title: daily.title,
            tiers,
            cards,
            placement: Object.fromEntries(tiers.map((t) => [t.id, []])),
            pool: [...cardIds],
            favorite: false,
            daily: { day: daily.day, emoji: daily.emoji, cardIds },
            emoji: daily.emoji,
            importedFrom: `daily:${daily.day}`,
            createdAt: now,
            updatedAt: now,
            openedAt: now,
          };
          set((state) => ({ lists: { ...state.lists, [list.id]: list } }));
          return list.id;
        },

        validateDaily: (listId) => {
          const list = get().lists[listId];
          if (!list?.daily || list.pool.length > 0) return false;
          const ranks = rankingOf(list, list.daily.cardIds);
          if (!ranks) return false;
          // Like a popular list, it can be ranked again: the first validation date stays (streak, history).
          patchList(listId, (l) => ({
            daily: { ...l.daily!, validatedAt: l.daily!.validatedAt ?? Date.now(), validatedRanks: ranks, voteSent: false },
          }));
          return true;
        },

        createPopularList: (template) => {
          const id = get().createList({
            title: template.title,
            tierLabels: CLASSIC_TIERS,
            cardLabels: template.items,
            cardRanks: template.ranks,
            emoji: template.emoji,
          });
          set((state) => {
            const list = state.lists[id];
            // Cards were created in the order of the template items.
            const cardIds = Object.keys(list.cards);
            const popular = { key: template.key, voteKey: popularVoteKey(template), cardIds };
            return { lists: { ...state.lists, [id]: { ...list, popular } } };
          });
          return id;
        },

        validatePopular: (listId) => {
          const list = get().lists[listId];
          if (!list?.popular || list.pool.length > 0) return false;
          const ranks = rankingOf(list, list.popular.cardIds);
          if (!ranks) return false;
          patchList(listId, (l) => ({ popular: { ...l.popular!, validatedAt: Date.now(), validatedRanks: ranks, voteSent: false } }));
          return true;
        },

        markVoteSent: (listId) =>
          set((state) => {
            const list = state.lists[listId];
            if (list?.daily) return { lists: { ...state.lists, [listId]: { ...list, daily: { ...list.daily, voteSent: true } } } };
            if (list?.popular) return { lists: { ...state.lists, [listId]: { ...list, popular: { ...list.popular, voteSent: true } } } };
            return state;
          }),

        toggleTemplateFavorite: (key) => {
          const favorite = !get().favoriteTemplates.includes(key);
          set((state) => ({
            favoriteTemplates: favorite ? [...state.favoriteTemplates, key] : state.favoriteTemplates.filter((k) => k !== key),
          }));
          return favorite;
        },

        setProfile: (profile) => set({ profile }),

        markMailViewed: (mailId) =>
          set((state) =>
            // Mail older than 90 days is gone from the server: the last 300 ids are plenty.
            state.viewedMail.includes(mailId) ? state : { viewedMail: [...state.viewedMail, mailId].slice(-300) },
          ),

        clearAll: () => {
          Object.values(get().lists).forEach((l) =>
            Object.values(l.cards).forEach((c) => deleteCardImage(c.imageName)),
          );
          set({ lists: {} });
        },
      };
    },
    {
      name: STORE_KEY,
      // Bump with every change to the persisted shape, and handle it in `migrate`.
      version: 4,
      migrate: (persisted, version) => migrateStore(persisted, version),
      // Unreadable data (corrupted, or a migration that throws): keep a copy aside
      // and start from the defaults, rather than staying on a blank screen.
      onRehydrateStorage: () => (_state, error) => {
        if (error) recoverFromHydrationError(error);
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lists: state.lists,
        settings: state.settings,
        deviceId: state.deviceId,
        favoriteTemplates: state.favoriteTemplates,
        profile: state.profile,
        viewedMail: state.viewedMail,
        badgeChoices: state.badgeChoices,
        shownBadges: state.shownBadges,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          lists: p.lists ?? current.lists,
          deviceId: p.deviceId ?? current.deviceId,
          favoriteTemplates: p.favoriteTemplates ?? current.favoriteTemplates,
          profile: p.profile ?? current.profile,
          viewedMail: p.viewedMail ?? current.viewedMail,
          badgeChoices: p.badgeChoices ?? current.badgeChoices,
          shownBadges: p.shownBadges ?? current.shownBadges,
          settings: { ...DEFAULT_SETTINGS, ...p.settings },
        };
      },
    },
  ),
);

/** Set when the saved data couldn't be read: the app runs from the defaults. */
let recovered = false;
const recoveryListeners = new Set<() => void>();

async function recoverFromHydrationError(error: unknown): Promise<void> {
  console.error('Saved data could not be loaded', error);
  try {
    // Copied before anything is saved over it, so the lists can still be rescued.
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) await AsyncStorage.setItem(`${STORE_KEY}-backup-${Date.now()}`, raw);
  } catch {
    // Too big or unreadable even as text: nothing can be kept.
  }
  recovered = true;
  recoveryListeners.forEach((cb) => cb());
}

/** Whether the saved data was lost at launch (then shown once to the player). */
export function hydrationRecovered(): boolean {
  return recovered;
}

const subscribeHydration = (onChange: () => void) => {
  recoveryListeners.add(onChange);
  const unsubscribe = useTierStore.persist.onFinishHydration(onChange);
  return () => {
    recoveryListeners.delete(onChange);
    unsubscribe();
  };
};
const getHydrated = () => recovered || useTierStore.persist.hasHydrated();

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, getHydrated, getHydrated);
}
