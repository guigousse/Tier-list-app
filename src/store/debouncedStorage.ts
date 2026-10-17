import type { PersistStorage, StorageValue } from 'zustand/middleware';

type TextStorage = {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => unknown;
  removeItem: (name: string) => unknown;
};

/**
 * Like zustand's createJSONStorage, but a burst of changes is written once: the whole
 * save (1 to 2 MB after a year of play) was serialized and rewritten at every card
 * dropped (measured: 10 writes for 10 moves). The last state waits `delay` ms, and
 * `flush` writes it at once (the app leaving the screen).
 */
export function debouncedJSONStorage<S>(storage: () => TextStorage, delay = 300): PersistStorage<S> & { flush: () => Promise<void> } {
  let pending: { name: string; value: StorageValue<S> } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = async () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const next = pending;
    pending = null;
    if (next) await storage().setItem(next.name, JSON.stringify(next.value));
  };

  return {
    getItem: async (name) => {
      const raw = await storage().getItem(name);
      return raw === null ? null : (JSON.parse(raw) as StorageValue<S>);
    },
    setItem: (name, value) => {
      pending = { name, value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), delay);
    },
    removeItem: async (name) => {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
      await storage().removeItem(name);
    },
    flush,
  };
}
