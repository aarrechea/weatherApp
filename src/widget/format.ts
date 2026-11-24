import type { Units } from "@/domain";

/** Short text for widget cells. Pure functions, no React. */

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const WIND_UNIT_LABEL: Record<Units["windSpeed"], string> = {
  kmh: "km/h",
  mph: "mph",
  ms: "m/s",
  kn: "kn",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** Rounded to a whole number. Avoids "-0", which `toFixed` would print. */
export function whole(value: number): string {
  return String(Math.round(value));
}

export function temperature(value: number): string {
  return `${whole(value)}°`;
}

export function percent(value: number): string {
  return `${whole(value)}%`;
}

export function windSpeed(value: number, units: Units): string {
  return `${whole(value)} ${WIND_UNIT_LABEL[units.windSpeed]}`;
}

/** Wind speed without the unit, for narrow cells. */
export function windSpeedShort(value: number): string {
  return whole(value);
}

export function windUnit(units: Units): string {
  return WIND_UNIT_LABEL[units.windSpeed];
}

/** The compass point the wind comes from: N, NE, E, ... */
export function compass(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  return COMPASS[Math.round(normalized / 45) % 8];
}

/**
 * One decimal below 10, whole numbers from 10. The choice is made after
 * rounding, so 9.96 is "10" and not "10.0".
 */
function compact(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded < 10 ? rounded.toFixed(1) : whole(value);
}

/** An amount and its unit kept apart, so they can go on separate lines. */
export interface Measure {
  amount: string;
  unit: string;
}

export function rainMeasure(value: number, units: Units): Measure {
  return {
    amount: compact(Math.max(0, value)),
    unit: units.precipitation === "inch" ? "in" : "mm",
  };
}

/** Wind speed, with the compass point added to the unit when it is known. */
export function windMeasure(
  value: number,
  units: Units,
  directionDegrees?: number,
): Measure {
  const unit = WIND_UNIT_LABEL[units.windSpeed];
  return {
    amount: whole(value),
    unit:
      directionDegrees === undefined
        ? unit
        : `${unit} ${compass(directionDegrees)}`,
  };
}

export function rain(value: number, units: Units): string {
  const { amount, unit } = rainMeasure(value, units);
  return `${amount}${unit}`;
}

/** Visibility is stored in meters. Shown in km, or miles with imperial rain. */
export function visibility(meters: number | null, units: Units): string {
  if (meters === null) return "–";
  if (units.precipitation === "inch") {
    return `${compact(meters / 1609.344)} mi`;
  }
  return `${compact(meters / 1000)} km`;
}

/** `HH:mm` at the forecast's location (shifted by its UTC offset). */
export function clockAtLocation(
  timeMs: number,
  utcOffsetSeconds: number,
): string {
  const shifted = new Date(timeMs + utcOffsetSeconds * 1000);
  return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** `HH` at the forecast's location, for the hourly columns. */
export function hourAtLocation(
  timeMs: number,
  utcOffsetSeconds: number,
): string {
  const shifted = new Date(timeMs + utcOffsetSeconds * 1000);
  return `${pad(shifted.getUTCHours())}h`;
}

/** `HH:mm` on the device clock, for "last updated". */
export function clockOnDevice(timeMs: number): string {
  const date = new Date(timeMs);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Weekday and day of the month of a `YYYY-MM-DD` date, for example `Wed 25`.
 * The day number tells apart two days with the same weekday in one list.
 */
export function weekdayAndDay(date: string): string {
  return `${weekday(date)} ${new Date(`${date}T00:00:00Z`).getUTCDate()}`;
}

/** Three-letter weekday of a `YYYY-MM-DD` date, for example `Mon`. */
export function weekday(date: string): string {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}
