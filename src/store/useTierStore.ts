import type { Language } from '../lib/i18n';
import { clampTitle, MAX_TITLE } from '../lib/listTitle';
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, type AppStateStatus } from 'react-native';

import { CARD_COLORS, type CardSize } from '../constants/theme';
import { nextRegionChange } from '../lib/regionChange';
import { CLASSIC_TIERS, sourceOf, tierColorAt, type Template } from '../constants/presets';
import { newId } from '../lib/id';
import { deleteCardImage, duplicateCardImage } from '../lib/images';
import type { DailyList } from '../lib/api';
import { isShareCode, type SharedList } from '../lib/share';
import { debouncedJSONStorage } from './debouncedStorage';
import { POOL, type Card, type Tier, type TierList, type Zone } from './types';
import { own } from '../lib/own';
import { t } from '../lib/i18n/useT';
import { publicTiers, syncedCopy, type IconLibrary } from '../lib/publicSync';

/** The player's social profile. `secret` proves it is theirs to the server; never shown. */
export type Profile = { id: string; secret: string; pseudo: string; tag: number; avatar: string };

export type Settings = {
  haptics: boolean;
  /** Click sound on buttons. */
  sounds: boolean;
  /** Daily local notification announcing the daily tier list, when it comes out (12:30 in Paris). */
  dailyReminder: boolean;
  /** Push notifications about friends: lists received, lists ranked, friends' rankings. */
  friendNotifications: boolean;
  /** Whether the reminder was already offered (after the first daily validation). */
  reminderAsked: boolean;
  /** Whether the welcome screens were seen. */
  onboarded: boolean;
  cardSize: CardSize;
  showCardLabels: boolean;
  /** Usage statistics (Firebase Analytics): asked once, changed in the settings. */
  analyticsConsent: 'unknown' | 'granted' | 'denied';
  /** The app's language: the phone's by default ('auto'), English when the app doesn't speak it. */
  language: Language | 'auto';
  /** The player's region (ISO country code) for the lists put forward: the phone's by default, 'world' for none. */
  region: string | 'auto' | 'world';
  /** Whether the region was confirmed once, after the welcome screens. */
  regionAsked: boolean;
  /** Last change of region from the settings: one a month (lib/regionChange.ts). */
  regionChangedAt?: number;
  /**
   * First launch on the welcome screens (lib/invite.ts). Optional, no migration: saves
   * from before it have none, and those players are not new.
   */
  joinedAt?: number;
  /** The "a friend invited you?" card was closed ("Later" or ×): never shown again. */
  inviteAsked?: boolean;
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
  /**
   * Last step celebrated on each reward path (MilestoneCelebration): what lies beyond is
   * shown full screen, once. null until the app first sees the player's progress, which
   * then counts as celebrated: no flood of the steps passed before this feature.
   */
  celebrated: { lists: number; flame: number } | null;
  /**
   * Progress the server kept (src/lib/progress.ts): lists completed and days of the
   * daily tier list played, counted from this device's votes. After a reinstall the
   * phone's lists are gone; this keeps the reward paths where they were.
   */
  restored: { completed: number; days: string[] };
  /** Secret of this install's credits wallet (the balance itself lives on the server). */
  walletSecret: string | null;
  /** Apple vouched for this install once (App Attest): the welcome bonus was asked for. */
  walletAttested: boolean;

  createList: (input: NewListInput) => string;
  /**
   * Adds a tier list opened from a share code or link (or finds the one already imported)
   * and returns its id: a challenge, its cards to rank without seeing the sharer's ranking.
   */
  importList: (shared: SharedList) => string;
  /** Freezes the ranking of a challenge once every card is placed. */
  answerChallenge: (listId: string) => boolean;
  /** The server was told the challenge was ranked: never again. */
  markChallengeClaimed: (listId: string) => void;
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
  /** Changes the region from the settings (null: worldwide); false while the month isn't over. */
  changeRegion: (region: string | null, now?: number) => boolean;
  clearAll: () => void;

  /** Creates the local copy of a daily tier list: classic S→D tiers, fixed cards. */
  createDailyList: (daily: DailyList) => string;
  /** Freezes the ranking of a daily tier list once every card is placed. */
  validateDaily: (listId: string) => boolean;
  /** Creates the local copy of a public tier list: its tiers, fixed cards, library images. */
  createPopularList: (template: Template, icons?: IconLibrary) => string;
  /** Brings the copy up to the public list as it is now (cards added, tiers, images). */
  syncPopular: (listId: string, template: Template, icons: IconLibrary) => void;
  /** Records the current ranking of a popular tier list as validated (can be done again). */
  validatePopular: (listId: string) => boolean;
  /** `ranks`: the popular ranking sent, marked sent only if it is still the one validated. */
  markVoteSent: (listId: string, ranks?: number[]) => void;
  toggleTemplateFavorite: (key: string) => boolean;
  setProfile: (profile: Profile | null) => void;
  markMailViewed: (mailId: string) => void;
};

const DEFAULT_SETTINGS: Settings = {
  haptics: true,
  sounds: true,
  dailyReminder: false,
  friendNotifications: true,
  reminderAsked: false,
  onboarded: false,
  cardSize: 'medium',
  showCardLabels: true,
  analyticsConsent: 'unknown',
  language: 'auto',
  region: 'auto',
  regionAsked: false,
};

/** Tier index (0 = S …) of each card of `cardIds`, or null if one isn't ranked. */
export function rankingOf(list: TierList, cardIds: string[]): number[] | null {
  const tierOf = new Map<string, number>();
  list.tiers.forEach((t, i) => (list.placement[t.id] ?? []).forEach((id) => tierOf.set(id, i)));
  const ranks = cardIds.map((id) => tierOf.get(id));
  return ranks.every((r) => r !== undefined) ? (ranks as number[]) : null;
}

/** Statistics key of a popular list: its template key and a hash of its cards. */
export function popularVoteKey(shown: Template): string {
  const template = sourceOf(shown);
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
  celebrated?: { lists: number; flame: number } | null;
  restored?: { completed: number; days: string[] };
  walletSecret?: string | null;
  walletAttested?: boolean;
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
  if (version < 5) {
    // v5: credits wallet. None yet: it opens at the next launch.
    data.walletSecret = null;
    data.walletAttested = false;
  }
  if (version < 6) {
    // v6: steps celebrated full screen. None: the first launch starts from the player's progress.
    data.celebrated = null;
  }
  if (version < 7) {
    // v7: progress kept by the server. Nothing yet: it comes at the next launch.
    data.restored = { completed: 0, days: [] };
  }
  return data;
}

const STORE_KEY = 'tiercraft-store';

const saveStorage = debouncedJSONStorage<Persisted>(() => AsyncStorage);

/** Leaving the screen (app switcher, home, lock): what waits is written at once. */
export function saveOnLeave(state: AppStateStatus): Promise<void> {
  return state === 'active' ? Promise.resolve() : saveStorage.flush();
}
AppState.addEventListener('change', saveOnLeave);

export const useTierStore = create<State>()(
  persist(
    (set, get) => {
      /** Applies `fn` to one list and bumps its `updatedAt`. */
      const patchList = (id: string, fn: (list: TierList) => Partial<TierList>) =>
        set((state) => {
          const list = own(state.lists, id);
          if (!list) return state;
          return {
            lists: { ...state.lists, [id]: { ...list, ...fn(list), updatedAt: Date.now() } },
          };
        });

      /** Creates the local copy of a shared list, cards in the order sent, and returns its id. */
      const addImported = (shared: SharedList): string => {
        const now = Date.now();
        const tiers = shared.tiers.map((t) => ({ id: newId(), label: t.label, color: t.color }));
        const cards: Record<string, Card> = {};
        const placement: Record<string, string[]> = Object.fromEntries(tiers.map((t) => [t.id, []]));
        const pool: string[] = [];
        for (const c of shared.cards) {
          const id = newId();
          cards[id] = { id, label: c.label, color: c.color, ...(c.iconUrl ? { iconUrl: c.iconUrl } : {}) };
          if (c.tier >= 0) placement[tiers[c.tier].id].push(id);
          else pool.push(id);
        }
        const list: TierList = {
          id: newId(),
          title: clampTitle(shared.title) || t('app.list.defaultTitle'),
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
      };

      return {
        lists: {},
        settings: DEFAULT_SETTINGS,
        deviceId: newId(),
        favoriteTemplates: [],
        profile: null,
        viewedMail: [],
        badgeChoices: {},
        shownBadges: [],
        celebrated: null,
        restored: { completed: 0, days: [] },
        walletSecret: null,
        walletAttested: false,

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
            title: clampTitle(title) || t('app.list.defaultTitle'),
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
          // Nothing to rank: an ordinary list to fill in, as before challenges.
          if (shared.cards.length === 0) return addImported(shared);
          const listId = addImported({ ...shared, cards: shared.cards.map((c) => ({ ...c, tier: -1 })) });
          patchList(listId, (l) => ({
            challenge: {
              ...(isShareCode(shared.code) ? { code: shared.code } : {}),
              ...(shared.from ? { from: shared.from } : {}),
              theirRanks: shared.cards.map((c) => c.tier),
              // addImported creates the cards in the order sent.
              cardIds: [...l.pool],
            },
          }));
          return listId;
        },

        answerChallenge: (listId) => {
          const list = get().lists[listId];
          if (!list?.challenge || list.challenge.answeredAt || list.pool.length > 0) return false;
          if (!rankingOf(list, list.challenge.cardIds)) return false;
          patchList(listId, (l) => ({ challenge: { ...l.challenge!, answeredAt: Date.now() } }));
          return true;
        },

        markChallengeClaimed: (listId) => patchList(listId, (l) => (l.challenge ? { challenge: { ...l.challenge, claimed: true } } : {})),

        receiveMail: ({ id, from, list: shared }, again) => {
          const existing = Object.values(get().lists).find((l) => l.mail?.id === id);
          if (existing) {
            // Ranked again: the earlier ranking stays in place, to adjust.
            if (again) patchList(existing.id, (l) => ({ mail: { ...l.mail!, answeredAt: undefined } }));
            return existing.id;
          }
          // Cards to rank: the sender's ranking isn't shown.
          const listId = addImported({ ...shared, code: `mail:${id}`, cards: shared.cards.map((c) => ({ ...c, tier: -1 })) });
          // addImported creates the cards in the order sent.
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
            title: `${clampTitle(source.title, MAX_TITLE - ' (copie)'.length)} (copie)`,
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

        renameList: (id, title) => patchList(id, () => ({ title: clampTitle(title) || t('app.list.untitled') })),

        toggleFavorite: (id) => patchList(id, (l) => ({ favorite: !l.favorite })),

        markOpened: (id) =>
          set((state) => {
            const list = own(state.lists, id);
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
            const next = { ...card, ...patch };
            // A renamed card no longer matches the object the AI picked for it.
            if (patch.label !== undefined && patch.label !== card.label && !('aiConcept' in patch)) delete next.aiConcept;
            return { cards: { ...l.cards, [cardId]: next } };
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

        changeRegion: (region, now = Date.now()) => {
          if (nextRegionChange(get().settings.regionChangedAt, now) !== null) return false;
          get().updateSettings({ region: region ?? 'world', regionAsked: true, regionChangedAt: now });
          return true;
        },

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

        createPopularList: (shown, icons = {}) => {
          const template = sourceOf(shown);
          const id = get().createList({
            title: template.title,
            tierLabels: publicTiers(template),
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
          get().syncPopular(id, template, icons);
          return id;
        },

        syncPopular: (listId, template, icons) =>
          set((state) => {
            const list = own(state.lists, listId);
            const next = list && syncedCopy(list, sourceOf(template), icons);
            return next ? { lists: { ...state.lists, [listId]: next } } : state;
          }),

        validatePopular: (listId) => {
          const list = get().lists[listId];
          if (!list?.popular || list.pool.length > 0) return false;
          const ranks = rankingOf(list, list.popular.cardIds);
          if (!ranks) return false;
          patchList(listId, (l) => ({ popular: { ...l.popular!, validatedAt: Date.now(), validatedRanks: ranks, voteSent: false } }));
          return true;
        },

        markVoteSent: (listId, ranks) =>
          set((state) => {
            const list = own(state.lists, listId);
            if (list?.daily) return { lists: { ...state.lists, [listId]: { ...list, daily: { ...list.daily, voteSent: true } } } };
            if (list?.popular && ranks && JSON.stringify(ranks) !== JSON.stringify(list.popular.validatedRanks)) return state;
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
      version: 7,
      migrate: (persisted, version) => migrateStore(persisted, version),
      // Unreadable data (corrupted, or a migration that throws): keep a copy aside
      // and start from the defaults, rather than staying on a blank screen.
      onRehydrateStorage: () => (_state, error) => {
        if (error) recoverFromHydrationError(error);
      },
      storage: saveStorage,
      partialize: (state) => ({
        lists: state.lists,
        settings: state.settings,
        deviceId: state.deviceId,
        favoriteTemplates: state.favoriteTemplates,
        profile: state.profile,
        viewedMail: state.viewedMail,
        badgeChoices: state.badgeChoices,
        shownBadges: state.shownBadges,
        celebrated: state.celebrated,
        restored: state.restored,
        walletSecret: state.walletSecret,
        walletAttested: state.walletAttested,
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
          celebrated: p.celebrated ?? current.celebrated,
          restored: p.restored ?? current.restored,
          walletSecret: p.walletSecret ?? current.walletSecret,
          walletAttested: p.walletAttested ?? current.walletAttested,
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
