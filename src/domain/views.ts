import type { DailyWeather, Forecast, HourlyWeather } from "./forecast";

/**
 * Pick the part of a forecast each screen shows. A forecast can be cached for
 * hours, so everything is relative to `now` instead of assuming the first
 * entry is current.
 */

const HOUR_MS = 3_600_000;

/** The local calendar date (`YYYY-MM-DD`) at the forecast's location. */
export function localDate(timeMs: number, utcOffsetSeconds: number): string {
  return new Date(timeMs + utcOffsetSeconds * 1000).toISOString().slice(0, 10);
}

/** Index of the hour that contains `now`, or -1 if the forecast has none. */
function currentHourIndex(forecast: Forecast, now: number): number {
  return forecast.hourly.findIndex(
    (hour) => hour.time <= now && now < hour.time + HOUR_MS,
  );
}

/** The hourly entry for the hour that contains `now`, or null. */
export function currentHour(
  forecast: Forecast,
  now: number,
): HourlyWeather | null {
  const index = currentHourIndex(forecast, now);
  return index === -1 ? null : forecast.hourly[index];
}

/**
 * The next `count` hours, starting with the hour that contains `now`. Fewer
 * (or none) when the cached forecast has run out.
 */
export function nextHours(
  forecast: Forecast,
  now: number,
  count: number,
): HourlyWeather[] {
  const index = currentHourIndex(forecast, now);
  if (index === -1) return [];
  return forecast.hourly.slice(index, index + count);
}

/**
 * `count` hours spaced `stepHours` apart, starting with the hour after the one
 * that contains `now` (the current hour is what the current screen shows).
 * Fewer, or none, when the cached forecast has run out.
 */
export function hoursAhead(
  forecast: Forecast,
  now: number,
  count: number,
  stepHours: number,
): HourlyWeather[] {
  const index = currentHourIndex(forecast, now);
  if (index === -1) return [];
  const hours: HourlyWeather[] = [];
  for (let i = 0; i < count; i++) {
    const hour = forecast.hourly[index + 1 + i * stepHours];
    if (hour === undefined) break;
    hours.push(hour);
  }
  return hours;
}

/**
 * The hours of today that are still to come, including the one now running:
 * every hourly entry of today's local date whose hour has not yet ended.
 * Open-Meteo builds its daily totals from the entries stamped 00:00 to 23:00
 * of a date, so these are the same hours the daily rain total counts.
 */
export function restOfToday(forecast: Forecast, now: number): HourlyWeather[] {
  const date = localDate(now, forecast.utcOffsetSeconds);
  return forecast.hourly.filter(
    (hour) =>
      localDate(hour.time, forecast.utcOffsetSeconds) === date &&
      hour.time + HOUR_MS > now,
  );
}

export interface RainOutlook {
  /** Total rain expected over the rest of today, in the forecast's units. */
  total: number;
  /** The highest chance of rain in any hour of the rest of today, percent. */
  chance: number | null;
}

/**
 * Rain for the rest of today: the total amount and the highest hourly chance,
 * over the same hours (see `restOfToday`). Null when the forecast has no hours
 * left for today.
 */
export function rainOutlook(
  forecast: Forecast,
  now: number,
): RainOutlook | null {
  const hours = restOfToday(forecast, now);
  if (hours.length === 0) return null;
  const chances = hours
    .map((hour) => hour.precipitationProbability)
    .filter((value): value is number => value !== null);
  return {
    total: hours.reduce((sum, hour) => sum + hour.rain, 0),
    chance: chances.length > 0 ? Math.max(...chances) : null,
  };
}

/** Today's daily entry at the forecast's location, or null. */
export function today(forecast: Forecast, now: number): DailyWeather | null {
  const date = localDate(now, forecast.utcOffsetSeconds);
  return forecast.daily.find((day) => day.date === date) ?? null;
}

/**
 * The days after today, up to `count`. Today is left out because the current
 * screen already shows it.
 */
export function daysAhead(
  forecast: Forecast,
  now: number,
  count: number,
): DailyWeather[] {
  const date = localDate(now, forecast.utcOffsetSeconds);
  return forecast.daily.filter((day) => day.date > date).slice(0, count);
}

/**
 * Today and the following days, up to `count`. Days that are already over are
 * skipped, so a stale forecast shows fewer days rather than past ones.
 */
export function upcomingDays(
  forecast: Forecast,
  now: number,
  count: number = 7,
): DailyWeather[] {
  const date = localDate(now, forecast.utcOffsetSeconds);
  return forecast.daily.filter((day) => day.date >= date).slice(0, count);
}
