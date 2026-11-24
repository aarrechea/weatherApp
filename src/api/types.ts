import type { Forecast, GeoLocation, Units } from "@/domain";

export interface ForecastOptions {
  units?: Units;
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
}

export interface SearchOptions {
  /** ISO 639-1 language code for place names, for example `en`. */
  language?: string;
  /** Maximum number of results. */
  count?: number;
  timeoutMs?: number;
}

/** What every forecast provider adapter has to implement. */
export interface ForecastProvider {
  getForecast(
    latitude: number,
    longitude: number,
    options?: ForecastOptions,
  ): Promise<Forecast>;
}

/** What every geocoding provider adapter has to implement. */
export interface GeocodingProvider {
  searchCities(query: string, options?: SearchOptions): Promise<GeoLocation[]>;
}
