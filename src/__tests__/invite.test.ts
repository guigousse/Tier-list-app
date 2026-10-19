import AsyncStorage from '@react-native-async-storage/async-storage';

import { INVITE_DAYS, inviteFromText, joinStamp, shouldOfferInvite } from '../lib/invite';
import type { TierList } from '../store/types';
import { useTierStore, type Settings } from '../store/useTierStore';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 19, 12);

describe('reading a code from pasted text', () => {
  it('reads the text the share page copied', () => {
    expect(inviteFromText('Tiercraft K7M2PQ')).toEqual({ c: 'K7M2PQ' });
    expect(inviteFromText('  tiercraft: k7m-2pq\n')).toEqual({ c: 'K7M2PQ' });
  });

  it('reads a short link, alone or inside a message', () => {
    expect(inviteFromText('https://tier-list-app-share-site.vercel.app/s/K7M2PQ')).toEqual({ c: 'K7M2PQ' });
    expect(inviteFromText('Classe ma liste ! https://tier-list-app-share-site.vercel.app/s/k7m2pq merci')).toEqual({ c: 'K7M2PQ' });
  });

  it('reads a code typed or pasted alone', () => {
    expect(inviteFromText('k7m2pq')).toEqual({ c: 'K7M2PQ' });
    expect(inviteFromText('K7M 2PQ')).toEqual({ c: 'K7M2PQ' });
  });

  it('reads an offline link', () => {
    const d = Buffer.from(JSON.stringify({ v: 1, t: 'A', r: [['S', '#FF7F7F']], c: [] })).toString('base64url');
    expect(inviteFromText(`Tiercraft https://tier-list-app-share-site.vercel.app/import?d=${d}`)).toEqual({ d });
  });

  it('ignores anything else in the clipboard', () => {
    expect(inviteFromText('')).toBeNull();
    expect(inviteFromText('Rendez-vous demain à 18 h, number 6')).toBeNull();
    // I, O, 0 and 1 are not in the codes' alphabet.
    expect(inviteFromText('Tiercraft K7M2P0')).toBeNull();
    expect(inviteFromText('Tiercraft')).toBeNull();
  });
});

const settings = (patch: Partial<Settings> = {}): Settings => ({
  haptics: true,
  sounds: true,
  dailyReminder: false,
  friendNotifications: true,
  reminderAsked: false,
  onboarded: true,
  cardSize: 'medium',
  showCardLabels: true,
  analyticsConsent: 'granted',
  language: 'auto',
  region: 'auto',
  regionAsked: true,
  joinedAt: NOW - DAY,
  ...patch,
});

const list = (importedFrom?: string): TierList => ({
  id: importedFrom ?? 'mine',
  title: 'Liste',
  tiers: [],
  cards: {},
  placement: {},
  pool: [],
  favorite: false,
  importedFrom,
  createdAt: NOW,
  updatedAt: NOW,
  openedAt: NOW,
});

describe('when the invitation is offered', () => {
  it('to a new player, after the welcome screens and the region question', () => {
    expect(shouldOfferInvite(settings(), {}, NOW)).toBe(true);
  });

  it('never during the welcome screens or while the region is asked', () => {
    expect(shouldOfferInvite(settings({ onboarded: false }), {}, NOW)).toBe(false);
    expect(shouldOfferInvite(settings({ regionAsked: false }), {}, NOW)).toBe(false);
    expect(shouldOfferInvite(settings({ analyticsConsent: 'unknown' }), {}, NOW)).toBe(false);
  });

  it('not once closed', () => {
    expect(shouldOfferInvite(settings({ inviteAsked: true }), {}, NOW)).toBe(false);
  });

  it('only during the first days', () => {
    expect(shouldOfferInvite(settings({ joinedAt: NOW - (INVITE_DAYS * DAY - 1) }), {}, NOW)).toBe(true);
    expect(shouldOfferInvite(settings({ joinedAt: NOW - INVITE_DAYS * DAY }), {}, NOW)).toBe(false);
  });

  it('not to players who were here before the date was kept', () => {
    // Saves from older versions have no arrival date: those players are not new.
    expect(shouldOfferInvite(settings({ joinedAt: undefined }), {}, NOW)).toBe(false);
  });

  it('not when a list from a code or a link was already added', () => {
    expect(shouldOfferInvite(settings(), { a: list('K7M2PQ') }, NOW)).toBe(false);
    expect(shouldOfferInvite(settings(), { a: list('eyJ2IjoxLCJ0IjoiQSJ9') }, NOW)).toBe(false);
  });

  it('still when the only lists are the player’s own, daily ones or from friends in the app', () => {
    expect(shouldOfferInvite(settings(), { a: list(), b: list('daily:2026-10-19'), c: list('mail:42') }, NOW)).toBe(true);
  });
});

describe('the arrival date', () => {
  it('is kept while the welcome screens are not seen yet', () => {
    expect(joinStamp(settings({ onboarded: false, joinedAt: undefined }), NOW)).toEqual({ joinedAt: NOW });
  });

  it('is never set for a player already welcomed, nor moved', () => {
    expect(joinStamp(settings({ onboarded: true, joinedAt: undefined }), NOW)).toBeNull();
    expect(joinStamp(settings({ onboarded: false, joinedAt: NOW - DAY }), NOW)).toBeNull();
  });
});

describe('a save from before the invitation', () => {
  it('loads as it was, and its player is not taken for a new one', async () => {
    const old = { lists: { a: list() }, settings: { onboarded: true, regionAsked: true, region: 'GR' } };
    await AsyncStorage.setItem('tiercraft-store', JSON.stringify({ state: old, version: 7 }));
    await useTierStore.persist.rehydrate();
    const state = useTierStore.getState();
    expect(Object.keys(state.lists)).toEqual(['a']);
    expect(state.settings.region).toBe('GR');
    expect(state.settings.joinedAt).toBeUndefined();
    expect(shouldOfferInvite(state.settings, state.lists, Date.now())).toBe(false);
  });
});
