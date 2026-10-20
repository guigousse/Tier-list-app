import { create } from 'zustand';

import type { BoltShow } from '../components/useBoltShow';
import { useTierStore } from '../store/useTierStore';
import { type AdsSdk, loadAdsSdk } from './adsSdk';
import { adStatus, adTicket } from './api';
import { openWallet, setBalance, useCredits, walletForRequest } from './credits';

/**
 * The rewarded ad of the "Free energy" page: 5 credits, once a week. The app never
 * credits itself: it takes a ticket from the server, hands it to the ad as its
 * server-side verification data, and AdMob's signed callback pays the wallet
 * (supabase/functions/ad-reward). Here, only the waiting and the show.
 */
export const AD_REWARD = 5;

export const AD_UNIT_ID = {
  release: 'ca-app-pub-6928338731034491/7429871139',
  // Google's iOS test unit: a development build must never request real ads.
  dev: 'ca-app-pub-3940256099942544/1712485313',
};

export type AdStatus = { available: boolean; nextAt: string | null };

export type AdNotice = 'pending' | 'consent' | 'failed';

export type AdOutcome = 'credited' | 'pending' | 'unavailable' | 'consent' | 'closed' | 'failed' | 'busy' | 'unsupported';

/**
 * In memory only, like the referrals: the server holds the week's ad, and is asked
 * whenever the page opens. Nothing in the save, nothing to migrate.
 */
export const useRewardedAd = create<{
  status: AdStatus | null;
  /** 'loading': ticket, consent and ad on their way; 'showing': the ad is on screen; 'waiting': for the server's credit. */
  phase: 'idle' | 'loading' | 'showing' | 'waiting';
  notice: AdNotice | null;
  celebration: BoltShow | null;
}>(() => ({ status: null, phase: 'idle', notice: null, celebration: null }));

export function parseAdStatus(raw: unknown): AdStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.available !== 'boolean') return null;
  return { available: r.available, nextAt: typeof r.next_at === 'string' ? r.next_at : null };
}

type Ads = AdsSdk;

let sdk: Ads | null | undefined;
function native(): Ads | null {
  if (sdk === undefined) sdk = loadAdsSdk();
  return sdk;
}

export const adsSupported = () => native() !== null;

type T = (key: string, params?: Record<string, string | number>) => string;

/** "Prochaine pub mardi 27 octobre à 16:05": a week is too long to say a day without its date. */
export function nextAdText(nextAt: string, t: T, locale: string): string {
  const day = new Date(nextAt).toLocaleString(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return t('app.free.adNext', { day });
}

export async function refreshAdStatus(): Promise<void> {
  const wallet = useTierStore.getState().walletSecret;
  if (!wallet || !adsSupported()) return;
  try {
    const status = parseAdStatus(await adStatus(wallet));
    if (status) useRewardedAd.setState({ status });
  } catch {
    // Out of reach: the button stays as it was; the ticket asked at the tap decides.
  }
}

/**
 * The consent asked when the player taps, never at launch: UMP shows its form only where
 * the law wants one (EEA, UK…). Its service out of reach, the previous answer serves.
 */
async function canRequestAds(ads: Ads): Promise<boolean | null> {
  try {
    return (await ads.AdsConsent.gatherConsent()).canRequestAds;
  } catch {
    try {
      return (await ads.AdsConsent.getConsentInfo()).canRequestAds;
    } catch {
      return null;
    }
  }
}

let started: Promise<unknown> | null = null;

// An ad that never answers must not hold the button forever.
const LOAD_TIMEOUT = 30_000;

/** Loads and shows the ad; whether the player watched it to its reward. */
function play(ads: Ads, ticket: string): Promise<'earned' | 'closed' | 'failed'> {
  return new Promise((resolve) => {
    const ad = ads.RewardedAd.createForAdRequest(__DEV__ ? AD_UNIT_ID.dev : AD_UNIT_ID.release, {
      // No tracking question in the app (no ATT): ads that know nothing of the player.
      requestNonPersonalizedAdsOnly: true,
      serverSideVerificationOptions: { customData: ticket },
    });
    let earned = false;
    let done = false;
    const timer = setTimeout(() => end('failed'), LOAD_TIMEOUT);
    function end(result: 'earned' | 'closed' | 'failed') {
      if (done) return;
      done = true;
      clearTimeout(timer);
      ad.removeAllListeners();
      ad.destroy();
      resolve(result);
    }
    ad.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
      clearTimeout(timer);
      useRewardedAd.setState({ phase: 'showing' });
      ad.show().catch(() => end('failed'));
    });
    ad.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    ad.addAdEventListener(ads.AdEventType.CLOSED, () => end(earned ? 'earned' : 'closed'));
    ad.addAdEventListener(ads.AdEventType.ERROR, () => end(earned ? 'earned' : 'failed'));
    ad.load();
  });
}

// AdMob calls the server within seconds of the reward: about ten seconds of asking.
const POLL_MS = [1000, 1500, 2000, 2500, 3000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Waits for the server to have paid the ad: the week's ad then shows as taken. */
async function credited(wallet: string): Promise<AdStatus | null> {
  for (const ms of POLL_MS) {
    await sleep(ms);
    try {
      const status = parseAdStatus(await adStatus(wallet));
      if (status && !status.available) return status;
    } catch {
      // Asked again at the next step.
    }
  }
  return null;
}

/** The whole tap: ticket, consent, ad, then the server's credit and the bolts. */
export async function watchAd(): Promise<AdOutcome> {
  if (useRewardedAd.getState().phase !== 'idle') return 'busy';
  const ads = native();
  if (!ads) return 'unsupported';
  useRewardedAd.setState({ phase: 'loading', notice: null });
  const stop = (outcome: AdOutcome, notice: AdNotice | null = null) => {
    useRewardedAd.setState({ phase: 'idle', notice });
    return outcome;
  };
  try {
    const wallet = await walletForRequest();
    const raw = (await adTicket(wallet)) as { ticket?: unknown } | null;
    const status = parseAdStatus(raw);
    if (status && !status.available) {
      useRewardedAd.setState({ status });
      return stop('unavailable');
    }
    const ticket = typeof raw?.ticket === 'string' ? raw.ticket : null;
    if (!ticket) return stop('failed', 'failed');

    const allowed = await canRequestAds(ads);
    if (allowed === null) return stop('failed', 'failed');
    if (!allowed) return stop('consent', 'consent');
    started ??= ads
      .default()
      .initialize()
      .catch((e: unknown) => {
        // Tried again at the next tap.
        started = null;
        throw e;
      });
    await started;

    const before = useCredits.getState().balance;
    const watched = await play(ads, ticket);
    if (watched === 'closed') return stop('closed');
    if (watched === 'failed') return stop('failed', 'failed');

    useRewardedAd.setState({ phase: 'waiting' });
    const paid = await credited(wallet);
    if (!paid) return stop('pending', 'pending');
    const after = await openWallet();
    const to = typeof after === 'number' ? after : before === null ? null : before + AD_REWARD;
    if (after === null && to !== null) setBalance(to);
    useRewardedAd.setState({
      status: paid,
      celebration: before !== null && to !== null && to > before ? { from: before, to, key: Date.now() } : null,
    });
    return stop('credited');
  } catch {
    return stop('failed', 'failed');
  }
}
