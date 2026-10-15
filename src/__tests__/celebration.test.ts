import { coinTimes, counterAt, BURST } from '../lib/celebration';

describe('pack bought: the balance counts up', () => {
  it('starts from the old balance and lands exactly on the new one', () => {
    expect(counterAt(30, 390, 0)).toBe(30);
    expect(counterAt(30, 390, 1)).toBe(390);
    expect(counterAt(30, 390, 2)).toBe(390);
  });

  it('runs fast first then slows down, like a slot machine stopping', () => {
    const half = counterAt(0, 1000, 0.5);
    expect(half).toBeGreaterThan(500);
    expect(half).toBeLessThan(1000);
    // Whole credits only, never going back.
    const steps = Array.from({ length: 21 }, (_, i) => counterAt(0, 1000, i / 20));
    expect(steps.every((v, i) => Number.isInteger(v) && (i === 0 || v >= steps[i - 1]))).toBe(true);
  });

  it('rings a coin at a steady pace while it counts, spaced more than the same-tap guard', () => {
    const times = coinTimes();
    expect(times[0]).toBe(BURST.arrive);
    expect(times[times.length - 1]).toBeLessThanOrEqual(BURST.arrive + BURST.count);
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThan(60);
    expect(times.length).toBeGreaterThanOrEqual(10);
  });
});
