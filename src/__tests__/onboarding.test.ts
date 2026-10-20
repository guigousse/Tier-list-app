import { asksProfile } from '../lib/onboarding';

describe('the profile step of the onboarding', () => {
  it('comes once, to a player without a profile', () => {
    expect(asksProfile({ profileAsked: false }, null)).toBe(true);
    expect(asksProfile({ profileAsked: true }, null)).toBe(false);
  });

  it('never comes to a player who already has a profile', () => {
    expect(asksProfile({ profileAsked: false }, { pseudo: 'Léa' })).toBe(false);
  });
});
