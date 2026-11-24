import { openMeteoForecast } from "./openMeteo/forecast";
import { openMeteoGeocoding } from "./openMeteo/geocoding";
import type { ForecastProvider, GeocodingProvider } from "./types";

/**
 * The one place that decides which providers the app uses. To switch APIs,
 * write a new adapter that implements these interfaces and change it here.
 */
export const forecastProvider: ForecastProvider = openMeteoForecast;
export const geocodingProvider: GeocodingProvider = openMeteoGeocoding;
