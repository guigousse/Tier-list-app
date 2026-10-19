import { nextRegionChange, REGION_CHANGE_DAYS } from '../lib/regionChange';
import { useTierStore } from '../store/useTierStore';

const DAY = 24 * 60 * 60 * 1000;

describe('changing region, once a month', () => {
  beforeEach(() => useTierStore.getState().updateSettings({ region: 'auto', regionAsked: false, regionChangedAt: undefined }));

  it('is free the first time', () => {
    expect(nextRegionChange(undefined, Date.now())).toBeNull();
    expect(useTierStore.getState().changeRegion('GR')).toBe(true);
    expect(useTierStore.getState().settings.region).toBe('GR');
  });

  it('then waits a month', () => {
    const now = Date.now();
    useTierStore.getState().changeRegion('GR', now);
    expect(useTierStore.getState().changeRegion('FR', now + 10 * DAY)).toBe(false);
    expect(useTierStore.getState().settings.region).toBe('GR');
    expect(nextRegionChange(now, now + 10 * DAY)).toBe(now + REGION_CHANGE_DAYS * DAY);
    expect(useTierStore.getState().changeRegion('FR', now + REGION_CHANGE_DAYS * DAY)).toBe(true);
    expect(useTierStore.getState().settings.region).toBe('FR');
  });

  it('counts worldwide as a region', () => {
    const now = Date.now();
    useTierStore.getState().changeRegion(null, now);
    expect(useTierStore.getState().settings.region).toBe('world');
    expect(useTierStore.getState().changeRegion('ES', now + DAY)).toBe(false);
  });

  it('does not count the region confirmed after the welcome screens', () => {
    // The first question picks the region without starting the month.
    useTierStore.getState().updateSettings({ region: 'ES', regionAsked: true });
    expect(useTierStore.getState().changeRegion('FR')).toBe(true);
  });

  it('a clock put back does not unlock it', () => {
    const now = Date.now();
    useTierStore.getState().changeRegion('GR', now);
    expect(useTierStore.getState().changeRegion('FR', now - 40 * DAY)).toBe(false);
  });
});
