/**
 * The minimum a persistent store has to do. Everything in `src/storage` is
 * written against this, so swapping AsyncStorage for MMKV later means writing
 * one new implementation.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** In-memory store, for tests and tooling. */
export function createMemoryStore(): KeyValueStore {
  const items = new Map<string, string>();
  return {
    async getItem(key) {
      return items.get(key) ?? null;
    },
    async setItem(key, value) {
      items.set(key, value);
    },
    async removeItem(key) {
      items.delete(key);
    },
  };
}
