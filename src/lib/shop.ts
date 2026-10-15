import * as Iap from 'expo-iap';
import type { Purchase } from 'expo-iap';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { useTierStore } from '../store/useTierStore';
import { aiPurchase } from './api';
import { setBalance, walletForRequest } from './credits';

/**
 * The energy shop: packs bought in the App Store, credited by the server once it has
 * checked Apple's signature on the transaction (supabase/functions/ai-generate/
 * purchase.ts, same packs). Prices are shown as the App Store gives them, in the
 * player's currency; `price` is the French one, for the bonus and before the store answers.
 */
export type Pack = { id: string; credits: number; price: number; tag?: string };

export const PACKS: Pack[] = [
  { id: 'tiercraft.energy.60', credits: 60, price: 0.99 },
  { id: 'tiercraft.energy.200', credits: 200, price: 2.99 },
  // The one the eye should land on: twice the way in, a real bonus already.
  { id: 'tiercraft.energy.360', credits: 360, price: 4.99, tag: 'Le plus choisi' },
  { id: 'tiercraft.energy.800', credits: 800, price: 9.99 },
  { id: 'tiercraft.energy.1750', credits: 1750, price: 19.99, tag: 'Meilleur prix' },
];

/** Credits a pack gives beyond the 0.99 € one's rate, in percent. */
export function bonusPercent(pack: Pack): number {
  const base = PACKS[0].credits / PACKS[0].price;
  return Math.round((pack.credits / pack.price / base - 1) * 100);
}

export const useShop = create<{
  /** App Store prices by pack, in the player's currency ("4,99 €"). */
  prices: Record<string, string>;
  /** The pack whose purchase is under way. */
  buying: string | null;
  /** What to tell the player after a purchase. */
  message: string | null;
  /** A pack just credited: the shop page plays its bolts flying to the balance. */
  celebration: { packId: string; from: number; to: number; key: number } | null;
}>(() => ({ prices: {}, buying: null, message: null, celebration: null }));

/**
 * Credits a purchase Apple has confirmed, then finishes it. Unfinished, StoreKit hands
 * it back at every launch: a purchase made while the server was out of reach is
 * credited later, never lost, and never credited twice (the server keeps each one).
 */
export async function deliver(purchase: Purchase): Promise<void> {
  const jws = purchase.purchaseToken;
  if (!jws) return;
  let result: Awaited<ReturnType<typeof aiPurchase>>;
  try {
    result = await aiPurchase(useTierStore.getState().deviceId, await walletForRequest(), jws);
  } catch {
    useShop.setState({ buying: null, message: 'Achat reçu : les crédits arriveront au prochain lancement de l’app, une fois la connexion revenue.' });
    return;
  }
  const { balance, credited, credits } = result;
  // The new balance and the celebration together, before closing the transaction with
  // Apple (which takes a moment): the counter must not show the new balance meanwhile,
  // then fall back to the old one when the bolts leave.
  setBalance(balance);
  useShop.setState({
    buying: null,
    message: credited ? `+${credits} crédits d’énergie ajoutés.` : null,
    // Counted from the balance before this purchase, which the server's answer gives.
    celebration: credited ? { packId: purchase.productId, from: balance - credits, to: balance, key: Date.now() } : null,
  });
  // Left open, StoreKit hands it back at the next launch; the server knows it's credited.
  await Iap.finishTransaction({ purchase, isConsumable: true }).catch(() => {});
}

export async function buy(id: string): Promise<void> {
  useShop.setState({ buying: id, message: null });
  try {
    await Iap.requestPurchase({ request: { apple: { sku: id } }, type: 'in-app' });
  } catch {
    useShop.setState({ buying: null });
  }
}

let started: Promise<void> | null = null;

/**
 * Connects to the App Store once: prices of the packs, and the purchases to credit
 * (the one just made, and any left unfinished by a crash or a lost connection).
 */
export function openShop(): Promise<void> {
  if (Platform.OS !== 'ios') return Promise.resolve();
  started ??= (async () => {
    await Iap.initConnection();
    Iap.purchaseUpdatedListener((p) => {
      if (PACKS.some((pack) => pack.id === p.productId)) deliver(p);
    });
    Iap.purchaseErrorListener((e) => {
      const cancelled = e.code === Iap.ErrorCode.UserCancelled;
      useShop.setState({ buying: null, message: cancelled ? null : 'L’achat n’a pas pu aboutir : rien n’a été débité.' });
    });
    const products = await Iap.fetchProducts({ skus: PACKS.map((p) => p.id), type: 'in-app' });
    const prices: Record<string, string> = {};
    for (const p of (products ?? []) as { id: string; displayPrice: string }[]) prices[p.id] = p.displayPrice;
    useShop.setState({ prices });
    const pending = await Iap.getAvailablePurchases();
    for (const p of pending ?? []) if (PACKS.some((pack) => pack.id === p.productId)) deliver(p);
  })().catch(() => {
    // The App Store out of reach: try again next time the shop opens.
    started = null;
  });
  return started ?? Promise.resolve();
}
