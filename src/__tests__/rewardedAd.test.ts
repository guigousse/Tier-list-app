import * as ads from 'react-native-google-mobile-ads';

import { adStatus, adTicket } from '../lib/api';
import { openWallet, useCredits } from '../lib/credits';
import { t } from '../lib/i18n/useT';
import { AD_UNIT_ID, adsSupported, nextAdText, parseAdStatus, refreshAdStatus, useRewardedAd, watchAd } from '../lib/rewardedAd';
import { useTierStore } from '../store/useTierStore';

/** The ad SDK, in memory: each test says how the ad behaves once loaded. */
type Scenario = 'reward' | 'close' | 'no-fill';
let mockScenario: Scenario = 'reward';
type MockListener = (payload?: unknown) => void;
const mockCreated: { unit: string; options: unknown }[] = [];
jest.mock('react-native-google-mobile-ads', () => {
  const initialize = jest.fn(async () => []);
  class FakeAd {
    listeners = new Map<string, MockListener>();
    addAdEventListener(type: string, fn: MockListener) {
      this.listeners.set(type, fn);
      return () => this.listeners.delete(type);
    }
    emit(type: string, payload?: unknown) {
      this.listeners.get(type)?.(payload);
    }
    load() {
      setTimeout(() => {
        if (mockScenario === 'no-fill') this.emit('error', new Error('no-fill'));
        else this.emit('rewarded_loaded', { type: 'energie', amount: 5 });
      }, 0);
    }
    async show() {
      setTimeout(() => {
        this.emit('opened');
        if (mockScenario === 'reward') this.emit('rewarded_earned_reward', { type: 'energie', amount: 5 });
        this.emit('closed');
      }, 0);
    }
    removeAllListeners = jest.fn(() => this.listeners.clear());
    destroy = jest.fn();
  }
  return {
    __esModule: true,
    default: () => ({ initialize }),
    initialize,
    AdsConsent: { gatherConsent: jest.fn(), getConsentInfo: jest.fn() },
    AdEventType: { LOADED: 'loaded', ERROR: 'error', OPENED: 'opened', CLOSED: 'closed' },
    RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward' },
    TestIds: { REWARDED: 'ca-app-pub-3940256099942544/1712485313' },
    RewardedAd: {
      createForAdRequest: jest.fn((unit: string, options: unknown) => {
        mockCreated.push({ unit, options });
        return new FakeAd();
      }),
    },
  };
});
jest.mock('../lib/api', () => ({ ...jest.requireActual('../lib/api'), adStatus: jest.fn(), adTicket: jest.fn() }));
jest.mock('../lib/credits', () => ({ ...jest.requireActual('../lib/credits'), openWallet: jest.fn() }));

const status = adStatus as jest.MockedFunction<typeof adStatus>;
const ticket = adTicket as jest.MockedFunction<typeof adTicket>;
const consent = ads.AdsConsent as unknown as { gatherConsent: jest.Mock; getConsentInfo: jest.Mock };
const wallet = openWallet as jest.MockedFunction<typeof openWallet>;
const NEXT = '2026-10-27T14:05:00Z';

beforeEach(() => {
  jest.useFakeTimers();
  mockScenario = 'reward';
  mockCreated.length = 0;
  status.mockReset();
  ticket.mockReset();
  wallet.mockReset();
  consent.gatherConsent.mockReset().mockResolvedValue({ canRequestAds: true, status: 'OBTAINED' });
  consent.getConsentInfo.mockReset().mockResolvedValue({ canRequestAds: true });
  ticket.mockResolvedValue({ available: true, ticket: 'T'.repeat(64) });
  useTierStore.setState({ walletSecret: 'w', settings: { ...useTierStore.getState().settings, language: 'fr' } });
  useRewardedAd.setState({ status: null, phase: 'idle', notice: null, celebration: null });
  useCredits.setState({ balance: 12 });
});
afterEach(() => jest.useRealTimers());

/** Runs a flow to its end, timers included (the polling waits ~10 s at most). */
async function run<T>(p: Promise<T>): Promise<T> {
  for (let i = 0; i < 40; i++) await jest.advanceTimersByTimeAsync(500);
  return p;
}

describe('the status from the server', () => {
  it('available, or the date of the next one; a bad answer is none', () => {
    expect(parseAdStatus({ available: true, next_at: null })).toEqual({ available: true, nextAt: null });
    expect(parseAdStatus({ available: false, next_at: NEXT })).toEqual({ available: false, nextAt: NEXT });
    expect(parseAdStatus({ available: 'yes' })).toBeNull();
    expect(parseAdStatus(null)).toBeNull();
  });

  it('is kept in memory for the page', async () => {
    status.mockResolvedValue({ available: false, next_at: NEXT });
    await refreshAdStatus();
    expect(status).toHaveBeenCalledWith('w');
    expect(useRewardedAd.getState().status).toEqual({ available: false, nextAt: NEXT });
  });

  it('the next ad, said with its day and hour in the player’s language', () => {
    const text = nextAdText(NEXT, t, 'fr-FR');
    expect(text).toMatch(/^Prochaine pub /);
    expect(text).toContain('27 octobre');
  });
});

describe('the ads, only where the app can show them', () => {
  it('on iOS', () => {
    expect(adsSupported()).toBe(true);
  });
});

describe('watching an ad', () => {
  it('a ticket, the consent asked at the tap, then a non-personalised ad carrying the ticket', async () => {
    status.mockResolvedValue({ available: false, next_at: NEXT });
    wallet.mockImplementation(async () => {
      useCredits.setState({ balance: 17 });
      return 17;
    });
    await expect(run(watchAd())).resolves.toBe('credited');
    expect(ticket).toHaveBeenCalledWith('w');
    expect(consent.gatherConsent).toHaveBeenCalled();
    expect(mockCreated).toEqual([
      {
        unit: AD_UNIT_ID.dev,
        options: { requestNonPersonalizedAdsOnly: true, serverSideVerificationOptions: { customData: 'T'.repeat(64) } },
      },
    ]);
    // The server credited: the bolts fly from the old balance to the new one.
    expect(useRewardedAd.getState()).toMatchObject({
      phase: 'idle',
      notice: null,
      status: { available: false, nextAt: NEXT },
      celebration: { from: 12, to: 17 },
    });
  });

  it('the release build asks for the real rewarded unit', () => {
    expect(AD_UNIT_ID.release).toBe('ca-app-pub-6928338731034491/7429871139');
  });

  it('the server slow to credit: the reward is said to come, no show', async () => {
    status.mockResolvedValue({ available: true, next_at: null });
    await expect(run(watchAd())).resolves.toBe('pending');
    // Asked a few times over about ten seconds, not forever.
    expect(status.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(status.mock.calls.length).toBeLessThanOrEqual(6);
    expect(useRewardedAd.getState()).toMatchObject({ phase: 'idle', notice: 'pending', celebration: null });
    expect(t('app.free.adPending')).toBe('La récompense arrive dans un instant.');
  });

  it('closed before the end: nothing to wait for, no message', async () => {
    mockScenario = 'close';
    await expect(run(watchAd())).resolves.toBe('closed');
    expect(status).not.toHaveBeenCalled();
    expect(useRewardedAd.getState()).toMatchObject({ phase: 'idle', notice: null, celebration: null });
  });

  it('the week’s ad already paid: no consent asked, no ad, the next date', async () => {
    ticket.mockResolvedValue({ available: false, next_at: NEXT });
    await expect(run(watchAd())).resolves.toBe('unavailable');
    expect(consent.gatherConsent).not.toHaveBeenCalled();
    expect(mockCreated).toEqual([]);
    expect(useRewardedAd.getState().status).toEqual({ available: false, nextAt: NEXT });
  });

  it('consent that allows no ad: said clearly, no ad asked', async () => {
    consent.gatherConsent.mockResolvedValue({ canRequestAds: false, status: 'REQUIRED' });
    await expect(run(watchAd())).resolves.toBe('consent');
    expect(mockCreated).toEqual([]);
    expect(useRewardedAd.getState()).toMatchObject({ phase: 'idle', notice: 'consent' });
  });

  it('the consent form out of reach: the previous answer serves if it allows ads', async () => {
    consent.gatherConsent.mockRejectedValue(new Error('offline'));
    consent.getConsentInfo.mockResolvedValue({ canRequestAds: true });
    status.mockResolvedValue({ available: false, next_at: NEXT });
    wallet.mockResolvedValue(17);
    await expect(run(watchAd())).resolves.toBe('credited');
  });

  it('no ad to show: a message, the button free again', async () => {
    mockScenario = 'no-fill';
    await expect(run(watchAd())).resolves.toBe('failed');
    expect(useRewardedAd.getState()).toMatchObject({ phase: 'idle', notice: 'failed' });
  });

  it('the server out of reach for the ticket: a message, no ad', async () => {
    ticket.mockRejectedValue(new Error('offline'));
    await expect(run(watchAd())).resolves.toBe('failed');
    expect(mockCreated).toEqual([]);
  });

  it('a double tap plays one ad', async () => {
    status.mockResolvedValue({ available: false, next_at: NEXT });
    wallet.mockResolvedValue(17);
    const first = watchAd();
    const second = watchAd();
    await expect(run(second)).resolves.toBe('busy');
    await run(first);
    expect(mockCreated).toHaveLength(1);
  });
});
