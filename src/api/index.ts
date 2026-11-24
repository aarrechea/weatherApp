import { forecastProvider, geocodingProvider } from "./config";
import type { ForecastOptions, SearchOptions } from "./types";

export { loadForecast, type LoadedForecast } from "./loadForecast";
export { WeatherApiError, type WeatherApiErrorKind } from "./errors";
export type {
  ForecastOptions,
  ForecastProvider,
  GeocodingProvider,
  SearchOptions,
} from "./types";

/** Fetch the forecast for a place from the configured provider. */
export function getForecast(
  latitude: number,
  longitude: number,
  options?: ForecastOptions,
) {
  return forecastProvider.getForecast(latitude, longitude, options);
}

/** Look up places by name with the configured geocoding provider. */
export function searchCities(query: string, options?: SearchOptions) {
  return geocodingProvider.searchCities(query, options);
}
