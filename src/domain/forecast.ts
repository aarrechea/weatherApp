/**
 * The app's own weather model. UI, storage and the widget depend on these
 * types only, never on a provider's response format.
 */

export type Condition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "freezing-rain"
  | "snow"
  | "thunderstorm"
  | "unknown";

export type TemperatureUnit = "celsius" | "fahrenheit";
export type WindSpeedUnit = "kmh" | "mph" | "ms" | "kn";
export type PrecipitationUnit = "mm" | "inch";

export interface Units {
  temperature: TemperatureUnit;
  windSpeed: WindSpeedUnit;
  precipitation: PrecipitationUnit;
}

export const DEFAULT_UNITS: Units = {
  temperature: "celsius",
  windSpeed: "kmh",
  precipitation: "mm",
};

export interface CurrentWeather {
  /** Observation time, epoch milliseconds. */
  time: number;
  temperature: number;
  apparentTemperature: number;
  /** Relative humidity, percent. */
  humidity: number;
  isDay: boolean;
  /** Rain only, in `units.precipitation`. */
  rain: number;
  windSpeed: number;
  /** Degrees, the direction the wind comes from. */
  windDirection: number;
  windGusts: number;
  /** WMO weather code as reported by the provider. */
  weatherCode: number;
  condition: Condition;
}

export interface HourlyWeather {
  /** Start of the hour, epoch milliseconds. */
  time: number;
  temperature: number;
  apparentTemperature: number;
  /** Relative humidity, percent. */
  humidity: number;
  /** Percent, or null when the provider has no value. */
  precipitationProbability: number | null;
  /** Rain only, in `units.precipitation`. */
  rain: number;
  /** Always meters, whatever the units setting. Null when unknown. */
  visibility: number | null;
  windSpeed: number;
  /** Degrees, the direction the wind comes from. */
  windDirection: number;
  isDay: boolean;
  weatherCode: number;
  condition: Condition;
}

export interface DailyWeather {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  /** Total rain for the day, in `units.precipitation`. */
  rainSum: number;
  /** Percent, or null when the provider has no value. */
  precipitationProbabilityMax: number | null;
  windSpeedMax: number;
  windGustsMax: number;
  /** Epoch milliseconds. */
  sunrise: number;
  /** Epoch milliseconds. */
  sunset: number;
  weatherCode: number;
  condition: Condition;
}

export interface Forecast {
  latitude: number;
  longitude: number;
  /** IANA time zone name of the location, for example `Europe/Berlin`. */
  timezone: string;
  utcOffsetSeconds: number;
  /** Units every numeric value in this forecast is expressed in. */
  units: Units;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
}

/** A place returned by city search. */
export interface GeoLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
  /** First-level administrative area, for example a state or region. */
  region?: string;
  timezone?: string;
}
