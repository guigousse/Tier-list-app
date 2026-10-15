import * as AppIntegrity from '@expo/app-integrity';

import { aiChallenge, aiWallet } from '../lib/api';
import { creditsError, openWallet, useCredits } from '../lib/credits';
import { useTierStore } from '../store/useTierStore';

jest.mock('../lib/api', () => ({ aiChallenge: jest.fn(), aiWallet: jest.fn() }));
jest.mock('../lib/identity', () => ({ saveIdentity: jest.fn(async () => {}) }));
jest.mock('@expo/app-integrity', () => ({
  isSupported: true,
  generateKeyAsync: jest.fn(async () => 'key-1'),
  attestKeyAsync: jest.fn(async () => 'attestation-1'),
}));

const wallet = aiWallet as jest.Mock;
const challenge = aiChallenge as jest.Mock;

beforeEach(() => {
  useTierStore.setState({ walletSecret: null, walletAttested: false });
  useCredits.setState({ balance: null });
  wallet.mockReset();
  challenge.mockReset();
  (AppIntegrity.attestKeyAsync as jest.Mock).mockClear();
});

describe('credits wallet', () => {
  it('opens the wallet once with a long random secret, attested by Apple for the welcome bonus', async () => {
    challenge.mockResolvedValue({ challenge: 'c-1' });
    wallet.mockResolvedValue({ balance: 30, attested: true });

    expect(await openWallet()).toBe(30);

    const secret = useTierStore.getState().walletSecret!;
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(AppIntegrity.attestKeyAsync).toHaveBeenCalledWith('key-1', 'c-1');
    expect(wallet).toHaveBeenCalledWith(expect.any(String), secret, { keyId: 'key-1', attestation: 'attestation-1', challenge: 'c-1' });
    expect(useCredits.getState().balance).toBe(30);
    expect(useTierStore.getState().walletAttested).toBe(true);

    // Next time: same secret, no attestation again (the bonus was given once).
    wallet.mockResolvedValue({ balance: 12, attested: false });
    expect(await openWallet()).toBe(12);
    expect(wallet.mock.calls[1][1]).toBe(secret);
    expect(wallet.mock.calls[1][2]).toBeUndefined();
  });

  it('tries the attestation again later when it failed (offline, Apple busy)', async () => {
    challenge.mockRejectedValue(new Error('offline'));
    wallet.mockResolvedValue({ balance: 0, attested: false });
    expect(await openWallet()).toBe(0);
    expect(wallet.mock.calls[0][2]).toBeUndefined();
    expect(useTierStore.getState().walletAttested).toBe(false);

    challenge.mockResolvedValue({ challenge: 'c-2' });
    wallet.mockResolvedValue({ balance: 30, attested: true });
    expect(await openWallet()).toBe(30);
    expect(wallet.mock.calls[1][2]).toEqual({ keyId: 'key-1', attestation: 'attestation-1', challenge: 'c-2' });
  });

  it('keeps the last balance known when the server is out of reach', async () => {
    useCredits.setState({ balance: 17 });
    useTierStore.setState({ walletSecret: 'x'.repeat(64), walletAttested: true });
    wallet.mockRejectedValue(new Error('offline'));
    expect(await openWallet()).toBe(17);
  });

  it('says plainly when the balance is too low', () => {
    expect(creditsError(new Error('credits'))).toContain('crédits');
    expect(creditsError(new Error('other'))).toBeNull();
  });
});
