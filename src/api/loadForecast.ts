import type { Forecast, ResolvedLocation } from "@/domain";
import { forecastCache, type ForecastCache } from "@/storage";

import { forecastProvider } from "./config";
import { WeatherApiError } from "./errors";
import type { ForecastOptions } from "./types";

export interface LoadedForecast {
  forecast: Forecast;
  /** When this data was fetched from the provider, epoch milliseconds. */
  fetchedAt: number;
  /** `cache` means the network failed and this is the last saved forecast. */
  source: "network" | "cache";
  /** Why the network request failed, when `source` is `cache`. */
  error?: WeatherApiError;
}

function toApiError(error: unknown): WeatherApiError {
  if (error instanceof WeatherApiError) return error;
  return new WeatherApiError(
    "network",
    error instanceof Error ? error.message : "Unknown error.",
    { cause: error },
  );
}

/**
 * Fetch a fresh forecast for a location and cache it under its slot. If the
 * request fails, fall back to the cached forecast for that slot, so the app
 * and widget keep working offline. Throws only when the request fails and
 * there is nothing usable cached.
 *
 * The cached forecast keeps the units it was fetched in (`forecast.units`),
 * so show values with those units, not the current setting.
 */
export async function loadForecast(
  location: Pick<ResolvedLocation, "slot" | "latitude" | "longitude">,
  options?: ForecastOptions,
  cache: ForecastCache = forecastCache,
): Promise<LoadedForecast> {
  const { slot, latitude, longitude } = location;
  try {
    const forecast = await forecastProvider.getForecast(
      latitude,
      longitude,
      options,
    );
    const fetchedAt = Date.now();
    await cache.save(slot, latitude, longitude, forecast, fetchedAt);
    return { forecast, fetchedAt, source: "network" };
  } catch (cause) {
    const error = toApiError(cause);
    const cached = await cache.get(slot, latitude, longitude);
    if (cached === null) throw error;
    return { ...cached, source: "cache", error };
  }
}
