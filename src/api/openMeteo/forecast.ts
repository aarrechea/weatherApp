import {
  DEFAULT_UNITS,
  conditionFromCode,
  type CurrentWeather,
  type DailyWeather,
  type Forecast,
  type HourlyWeather,
} from "@/domain";

import { buildUrl, fetchJson } from "../http";
import type { ForecastOptions, ForecastProvider } from "../types";
import {
  asColumn,
  asNullableNumber,
  asNumber,
  asObject,
  asString,
  parseError,
  type JsonObject,
} from "./parse";

export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const CURRENT_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "rain",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
];

const HOURLY_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation_probability",
  "rain",
  "visibility",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "is_day",
];

const DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "rain_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "sunrise",
  "sunset",
];

/**
 * Today plus eight more days: the daily screen shows the eight days after
 * today. Open-Meteo allows up to 16, but accuracy drops with distance.
 */
const FORECAST_DAYS = 9;

export function buildForecastUrl(
  latitude: number,
  longitude: number,
  units = DEFAULT_UNITS,
): string {
  return buildUrl(FORECAST_URL, {
    latitude,
    longitude,
    current: CURRENT_VARIABLES.join(","),
    hourly: HOURLY_VARIABLES.join(","),
    daily: DAILY_VARIABLES.join(","),
    forecast_days: FORECAST_DAYS,
    // Local time zone of the place, with exact instants as unix seconds so
    // daylight saving changes inside the window cannot shift any value.
    timezone: "auto",
    timeformat: "unixtime",
    temperature_unit: units.temperature,
    wind_speed_unit: units.windSpeed,
    precipitation_unit: units.precipitation,
  });
}

/** Unix seconds from the provider to epoch milliseconds. */
function toMillis(seconds: unknown, field: string): number {
  return asNumber(seconds, field) * 1000;
}

/**
 * Daily timestamps are local midnight computed with the response's single UTC
 * offset, so adding the offset back gives the calendar date.
 */
function toLocalDate(seconds: unknown, utcOffsetSeconds: number): string {
  const shifted = (asNumber(seconds, "daily.time") + utcOffsetSeconds) * 1000;
  return new Date(shifted).toISOString().slice(0, 10);
}

function mapCurrent(raw: JsonObject): CurrentWeather {
  const weatherCode = asNumber(raw.weather_code, "current.weather_code");
  return {
    time: toMillis(raw.time, "current.time"),
    temperature: asNumber(raw.temperature_2m, "current.temperature_2m"),
    apparentTemperature: asNumber(
      raw.apparent_temperature,
      "current.apparent_temperature",
    ),
    humidity: asNumber(
      raw.relative_humidity_2m,
      "current.relative_humidity_2m",
    ),
    isDay: asNumber(raw.is_day, "current.is_day") === 1,
    rain: asNumber(raw.rain, "current.rain"),
    windSpeed: asNumber(raw.wind_speed_10m, "current.wind_speed_10m"),
    windDirection: asNumber(
      raw.wind_direction_10m,
      "current.wind_direction_10m",
    ),
    windGusts: asNumber(raw.wind_gusts_10m, "current.wind_gusts_10m"),
    weatherCode,
    condition: conditionFromCode(weatherCode),
  };
}

function mapHourly(raw: JsonObject): HourlyWeather[] {
  const times = asColumn(raw, "time");
  const temperature = asColumn(raw, "temperature_2m", times.length);
  const humidity = asColumn(raw, "relative_humidity_2m", times.length);
  const apparent = asColumn(raw, "apparent_temperature", times.length);
  const probability = asColumn(raw, "precipitation_probability", times.length);
  const rain = asColumn(raw, "rain", times.length);
  const visibility = asColumn(raw, "visibility", times.length);
  const codes = asColumn(raw, "weather_code", times.length);
  const wind = asColumn(raw, "wind_speed_10m", times.length);
  const windDirection = asColumn(raw, "wind_direction_10m", times.length);
  const isDay = asColumn(raw, "is_day", times.length);

  return times.map((time, i) => {
    const weatherCode = asNumber(codes[i], "hourly.weather_code");
    return {
      time: toMillis(time, "hourly.time"),
      temperature: asNumber(temperature[i], "hourly.temperature_2m"),
      apparentTemperature: asNumber(apparent[i], "hourly.apparent_temperature"),
      humidity: asNumber(humidity[i], "hourly.relative_humidity_2m"),
      precipitationProbability: asNullableNumber(
        probability[i],
        "hourly.precipitation_probability",
      ),
      rain: asNumber(rain[i], "hourly.rain"),
      visibility: asNullableNumber(visibility[i], "hourly.visibility"),
      windSpeed: asNumber(wind[i], "hourly.wind_speed_10m"),
      windDirection: asNumber(windDirection[i], "hourly.wind_direction_10m"),
      isDay: asNumber(isDay[i], "hourly.is_day") === 1,
      weatherCode,
      condition: conditionFromCode(weatherCode),
    };
  });
}

function mapDaily(raw: JsonObject, utcOffsetSeconds: number): DailyWeather[] {
  const times = asColumn(raw, "time");
  const codes = asColumn(raw, "weather_code", times.length);
  const max = asColumn(raw, "temperature_2m_max", times.length);
  const min = asColumn(raw, "temperature_2m_min", times.length);
  const rainSum = asColumn(raw, "rain_sum", times.length);
  const probability = asColumn(
    raw,
    "precipitation_probability_max",
    times.length,
  );
  const wind = asColumn(raw, "wind_speed_10m_max", times.length);
  const gusts = asColumn(raw, "wind_gusts_10m_max", times.length);
  const sunrise = asColumn(raw, "sunrise", times.length);
  const sunset = asColumn(raw, "sunset", times.length);

  return times.map((time, i) => {
    const weatherCode = asNumber(codes[i], "daily.weather_code");
    return {
      date: toLocalDate(time, utcOffsetSeconds),
      temperatureMax: asNumber(max[i], "daily.temperature_2m_max"),
      temperatureMin: asNumber(min[i], "daily.temperature_2m_min"),
      rainSum: asNumber(rainSum[i], "daily.rain_sum"),
      precipitationProbabilityMax: asNullableNumber(
        probability[i],
        "daily.precipitation_probability_max",
      ),
      windSpeedMax: asNumber(wind[i], "daily.wind_speed_10m_max"),
      windGustsMax: asNumber(gusts[i], "daily.wind_gusts_10m_max"),
      sunrise: toMillis(sunrise[i], "daily.sunrise"),
      sunset: toMillis(sunset[i], "daily.sunset"),
      weatherCode,
      condition: conditionFromCode(weatherCode),
    };
  });
}

/** Convert a raw Open-Meteo forecast response into the app's `Forecast`. */
export function mapForecastResponse(
  body: unknown,
  units = DEFAULT_UNITS,
): Forecast {
  const root = asObject(body, "response");
  const utcOffsetSeconds = asNumber(
    root.utc_offset_seconds,
    "utc_offset_seconds",
  );

  const hourly = mapHourly(asObject(root.hourly, "hourly"));
  const daily = mapDaily(asObject(root.daily, "daily"), utcOffsetSeconds);
  if (hourly.length === 0 || daily.length === 0) {
    throw parseError("The forecast contained no hourly or daily data.");
  }

  return {
    latitude: asNumber(root.latitude, "latitude"),
    longitude: asNumber(root.longitude, "longitude"),
    timezone: asString(root.timezone, "timezone"),
    utcOffsetSeconds,
    units,
    current: mapCurrent(asObject(root.current, "current")),
    hourly,
    daily,
  };
}

export const openMeteoForecast: ForecastProvider = {
  async getForecast(latitude, longitude, options: ForecastOptions = {}) {
    const units = options.units ?? DEFAULT_UNITS;
    const body = await fetchJson(
      buildForecastUrl(latitude, longitude, units),
      options.timeoutMs,
    );
    return mapForecastResponse(body, units);
  },
};
