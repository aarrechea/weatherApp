import { distanceKm, type Forecast } from "@/domain";

import type { KeyValueStore } from "./keyValueStore";

const CACHE_VERSION = 3;

/**
 * A cached forecast is only reused for a request this close to where it was
 * made. That is smaller than a forecast grid cell, so the numbers still hold,
 * but a "follow me" forecast is not shown after travelling to another city.
 */
const MAX_CACHE_DISTANCE_KM = 5;

export interface CachedForecast {
  forecast: Forecast;
  /** When the forecast was fetched from the provider, epoch milliseconds. */
  fetchedAt: number;
}

/**
 * Keeps the latest forecast for each location slot (see `ResolvedLocation`),
 * so every saved place and "follow me" can be shown offline.
 */
export interface ForecastCache {
  get(
    slot: string,
    latitude: number,
    longitude: number,
  ): Promise<CachedForecast | null>;
  save(
    slot: string,
    latitude: number,
    longitude: number,
    forecast: Forecast,
    fetchedAt?: number,
  ): Promise<void>;
  /** Forget one slot, for example when a saved place is removed. */
  remove(slot: string): Promise<void>;
}

interface StoredEntry {
  version: number;
  /** Where the request was made for, not where the provider snapped it to. */
  latitude: number;
  longitude: number;
  fetchedAt: number;
  forecast: Forecast;
}

function keyFor(slot: string): string {
  return `forecast:${slot}`;
}

function isStoredEntry(value: unknown): value is StoredEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<StoredEntry>;
  return (
    entry.version === CACHE_VERSION &&
    typeof entry.latitude === "number" &&
    typeof entry.longitude === "number" &&
    typeof entry.fetchedAt === "number" &&
    typeof entry.forecast === "object" &&
    entry.forecast !== null &&
    Array.isArray(entry.forecast.hourly) &&
    Array.isArray(entry.forecast.daily) &&
    typeof entry.forecast.current === "object"
  );
}

/** Storage problems never throw: a broken cache is just a miss. */
export function createForecastCache(store: KeyValueStore): ForecastCache {
  return {
    async get(slot, latitude, longitude) {
      try {
        const raw = await store.getItem(keyFor(slot));
        if (raw === null) return null;
        const entry: unknown = JSON.parse(raw);
        if (!isStoredEntry(entry)) return null;
        const distance = distanceKm(
          entry.latitude,
          entry.longitude,
          latitude,
          longitude,
        );
        if (distance > MAX_CACHE_DISTANCE_KM) return null;
        return { forecast: entry.forecast, fetchedAt: entry.fetchedAt };
      } catch {
        return null;
      }
    },

    async save(slot, latitude, longitude, forecast, fetchedAt = Date.now()) {
      const entry: StoredEntry = {
        version: CACHE_VERSION,
        latitude,
        longitude,
        fetchedAt,
        forecast,
      };
      try {
        await store.setItem(keyFor(slot), JSON.stringify(entry));
      } catch {
        // Failing to cache must not fail a forecast that was fetched fine.
      }
    },

    async remove(slot) {
      try {
        await store.removeItem(keyFor(slot));
      } catch {
        // Nothing useful to do.
      }
    },
  };
}
