import * as Iap from 'expo-iap';

import { aiPurchase } from '../lib/api';
import { setBalance } from '../lib/credits';
import { bonusPercent, buy, deliver, PACKS, useShop } from '../lib/shop';

jest.mock('expo-iap', () => ({
  requestPurchase: jest.fn(async () => null),
  finishTransaction: jest.fn(async () => {}),
}));
jest.mock('../lib/api', () => ({ aiPurchase: jest.fn() }));
jest.mock('../lib/credits', () => ({
  walletForRequest: jest.fn(async () => 'secret-du-porte-monnaie'),
  setBalance: jest.fn(),
}));

const purchase = aiPurchase as jest.Mock;
const finish = Iap.finishTransaction as jest.Mock;
const bought = { productId: 'tiercraft.energy.360', purchaseToken: 'jws-signé-par-apple', id: 'tx-1' };

beforeEach(() => {
  purchase.mockReset();
  finish.mockClear();
  (setBalance as jest.Mock).mockClear();
  (Iap.requestPurchase as jest.Mock).mockClear();
  useShop.setState({ buying: null, message: null });
});

describe('energy shop', () => {
  it('sells five packs, more credits per euro the bigger, a 0.99 € way in first', () => {
    expect(PACKS.map((p) => [p.price, p.credits])).toEqual([
      [0.99, 60],
      [2.99, 200],
      [4.99, 360],
      [9.99, 800],
      [19.99, 1750],
    ]);
    // Said on each pack, against the 0.99 € one.
    expect(PACKS.map(bonusPercent)).toEqual([0, 10, 19, 32, 44]);
  });

  it('asks the App Store for the pack', async () => {
    await buy('tiercraft.energy.800');
    expect(Iap.requestPurchase).toHaveBeenCalledWith({ request: { apple: { sku: 'tiercraft.energy.800' } }, type: 'in-app' });
    expect(useShop.getState().buying).toBe('tiercraft.energy.800');
  });

  it('has the server check the purchase and add the credits, then finishes it with Apple', async () => {
    purchase.mockResolvedValue({ balance: 390, credited: true, credits: 360 });
    await deliver(bought as never);
    expect(purchase).toHaveBeenCalledWith(expect.any(String), 'secret-du-porte-monnaie', 'jws-signé-par-apple');
    expect(setBalance).toHaveBeenCalledWith(390);
    expect(finish).toHaveBeenCalledWith({ purchase: bought, isConsumable: true });
    expect(useShop.getState().message).toContain('360');
  });

  it('keeps an unpaid purchase open when the server is out of reach: Apple gives it back at the next launch', async () => {
    purchase.mockRejectedValue(new Error('Network request failed'));
    await deliver(bought as never);
    expect(finish).not.toHaveBeenCalled();
    expect(useShop.getState().message).toContain('prochain');
  });

  it('finishes a purchase already credited (sent again after a crash) without crediting it twice', async () => {
    purchase.mockResolvedValue({ balance: 390, credited: false, credits: 360 });
    await deliver(bought as never);
    expect(finish).toHaveBeenCalled();
    expect(useShop.getState().message).toBeNull();
  });
});
