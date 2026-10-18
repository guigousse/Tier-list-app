import * as firebase from '@react-native-firebase/analytics';

import { applyConsent, screenName, track, trackScreen } from '../lib/analytics';
import { useTierStore } from '../store/useTierStore';

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(async () => {}),
  logScreenView: jest.fn(async () => {}),
  setAnalyticsCollectionEnabled: jest.fn(async () => {}),
  setConsent: jest.fn(async () => {}),
}));

const fb = firebase as unknown as Record<string, jest.Mock>;
const consent = (analyticsConsent: 'unknown' | 'granted' | 'denied') =>
  useTierStore.setState((s) => ({ settings: { ...s.settings, analyticsConsent } }));

beforeEach(() => jest.clearAllMocks());

describe('nothing leaves the phone without the player’s yes', () => {
  it('not asked yet, or refused: no event, no screen', () => {
    for (const c of ['unknown', 'denied'] as const) {
      consent(c);
      track('list_validated', { kind: 'public' });
      trackScreen(['editor', '[id]']);
    }
    expect(fb.logEvent).not.toHaveBeenCalled();
    expect(fb.logScreenView).not.toHaveBeenCalled();
  });

  it('refused: collection switched off', () => {
    applyConsent('denied');
    expect(fb.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), false);
  });

  it('accepted: collection on, measurement only (never advertising)', () => {
    applyConsent('granted');
    expect(fb.setAnalyticsCollectionEnabled).toHaveBeenCalledWith(expect.anything(), true);
    expect(fb.setConsent).toHaveBeenCalledWith(expect.anything(), {
      analytics_storage: true,
      ad_storage: false,
      ad_user_data: false,
      ad_personalization: false,
    });
  });

  it('accepted: the events and the screens go out', () => {
    consent('granted');
    track('list_validated', { kind: 'daily' });
    trackScreen(['results', '[id]']);
    expect(fb.logEvent).toHaveBeenCalledWith(expect.anything(), 'list_validated', { kind: 'daily' });
    expect(fb.logScreenView).toHaveBeenCalledWith(expect.anything(), { screen_name: 'results/[id]', screen_class: 'results/[id]' });
  });
});

describe('the name of a screen', () => {
  it('the route, not the list it shows: no id, no title', () => {
    expect(screenName(['editor', '[id]'])).toBe('editor/[id]');
    expect(screenName([])).toBe('index');
  });
});
