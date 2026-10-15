/**
 * The show of a pack bought (src/app/store.tsx): a flash and a thunderclap, bolts flying
 * from the pack to the balance, then the balance counting up to its new value while
 * coins ring, like a slot machine paying out. Times in milliseconds from the purchase.
 */
export const BURST = {
  /** Bolts sent from the pack, one after the other. */
  bolts: 12,
  /** Between two bolts leaving. */
  stagger: 45,
  /** One bolt's flight to the balance. */
  flight: 650,
  /** The first bolt reaches the balance: the counter starts. */
  arrive: 650,
  /** The counter's run from the old balance to the new one. */
  count: 1500,
  /** Between two coins: above the 60 ms under which sound.ts merges repeats. */
  coinEvery: 95,
};

/** The balance shown `progress` (0 to 1) into the count: fast first, slowing to a stop. */
export function counterAt(from: number, to: number, progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const eased = 1 - Math.pow(1 - p, 3);
  return Math.round(from + (to - from) * eased);
}

/** When each coin rings, from the purchase: steadily, for as long as the counter runs. */
export function coinTimes(): number[] {
  const times: number[] = [];
  for (let t = 0; t <= BURST.count - BURST.coinEvery; t += BURST.coinEvery) times.push(BURST.arrive + t);
  return times;
}
