import {
  DEVICE_SLOT,
  currentHour,
  describeWeather,
  hoursAhead,
  rainOutlook,
  today,
  daysAhead,
  type Forecast,
  type WidgetScreen,
} from "@/domain";

import * as fmt from "./format";

/**
 * Everything the widget draws, as ready-to-show strings. The components only
 * lay these out, so what the widget says can be tested without rendering.
 */

/** One icon with its text on a single line, for example "💧 74%". */
export interface Cell {
  /** MaterialCommunityIcons glyph name. */
  icon: string;
  text: string;
}

export interface CurrentScreenModel {
  screen: "current";
  icon: string;
  temperature: string;
  condition: string;
  feelsLike: string;
  /** Today's maximum and minimum, shown at the right of the first row. */
  max: Cell | null;
  min: Cell | null;
  /**
   * Rows 2 and 3 as 3 columns by 2 rows, row by row. Each slot stacks up to
   * two cells, one above the other. An empty slot is left free.
   */
  grid: Cell[][];
}

export interface HourBlock {
  time: string;
  icon: string;
  temperature: string;
  feelsLike: string;
  rain: fmt.Measure;
  wind: fmt.Measure;
}

export interface HourlyScreenModel {
  screen: "hourly";
  /** Pairs of hours: each column stacks two hours, one above the other. */
  columns: HourBlock[][];
}

export interface DayBlock {
  weekday: string;
  icon: string;
  max: string;
  min: string;
  rain: fmt.Measure;
  /** The day's highest chance of rain, such as "30%". Null when unknown. */
  rainChance: string | null;
  wind: fmt.Measure;
}

export interface DailyScreenModel {
  screen: "daily";
  /** Pairs of days: each column stacks two days, one above the other. */
  columns: DayBlock[][];
}

export type ScreenModel =
  CurrentScreenModel | HourlyScreenModel | DailyScreenModel;

export interface WidgetCaption {
  /** Place name, or "Current location" for follow me. */
  location: string;
  isDevice: boolean;
  /** Text for the top-right corner, such as "Offline 14:05" or "14:05". */
  status: string;
}

export interface MessageModel {
  title: string;
  detail: string;
}

export interface WidgetContent {
  screen: WidgetScreen;
  /** Whether the location button shows the follow me icon. */
  isDevice: boolean;
  caption: WidgetCaption | null;
  /** Set when there is no forecast to show. */
  message: MessageModel | null;
  model: ScreenModel | null;
}

export const HOURS_SHOWN = 6;
/** The hourly screen shows every third hour, starting with the next one. */
export const HOUR_STEP = 3;
/** The eight days after today: four columns with two days each. */
export const DAYS_SHOWN = 8;

/** Two neighbouring items make one column: [a, b, c] becomes [[a, b], [c]]. */
export function pairUp<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < items.length; i += 2) pairs.push(items.slice(i, i + 2));
  return pairs;
}

function buildCurrent(forecast: Forecast, now: number): CurrentScreenModel {
  const { current, units, utcOffsetSeconds } = forecast;
  const description = describeWeather(current.weatherCode, current.isDay);
  const hour = currentHour(forecast, now);
  const day = today(forecast, now);

  const humidity: Cell = {
    icon: "water-percent",
    text: fmt.percent(current.humidity),
  };
  // Rain and its chance cover the same hours: the rest of today.
  const outlook = rainOutlook(forecast, now);
  const rain: Cell | null = outlook
    ? { icon: "weather-rainy", text: fmt.rain(outlook.total, units) }
    : null;
  const rainChance: Cell | null =
    outlook && outlook.chance !== null
      ? { icon: "umbrella-outline", text: fmt.percent(outlook.chance) }
      : null;
  const wind: Cell = {
    icon: "weather-windy",
    text: fmt.windSpeed(current.windSpeed, units),
  };
  const gusts: Cell = {
    icon: "weather-windy-variant",
    text: fmt.windSpeed(current.windGusts, units),
  };
  const visibility: Cell = {
    icon: "eye-outline",
    text: fmt.visibility(hour ? hour.visibility : null, units),
  };
  const direction: Cell = {
    icon: "navigation-variant",
    text: fmt.compass(current.windDirection),
  };
  const sun: Cell[] = day
    ? [
        {
          icon: "weather-sunset-up",
          text: fmt.clockAtLocation(day.sunrise, utcOffsetSeconds),
        },
        {
          icon: "weather-sunset-down",
          text: fmt.clockAtLocation(day.sunset, utcOffsetSeconds),
        },
      ]
    : [];

  return {
    screen: "current",
    icon: description.icon,
    temperature: fmt.temperature(current.temperature),
    condition: description.label,
    feelsLike: `Feels ${fmt.temperature(current.apparentTemperature)}`,
    max: day
      ? {
          icon: "thermometer-chevron-up",
          text: fmt.temperature(day.temperatureMax),
        }
      : null,
    min: day
      ? {
          icon: "thermometer-chevron-down",
          text: fmt.temperature(day.temperatureMin),
        }
      : null,
    grid: [
      // The rain amount and its chance are related, so they share a cell.
      rain ? (rainChance ? [rain, rainChance] : [rain]) : [],
      [wind, gusts],
      sun,
      [humidity],
      [direction],
      [visibility],
    ],
  };
}

function buildHourly(forecast: Forecast, now: number): HourlyScreenModel {
  const { units, utcOffsetSeconds } = forecast;
  const hours = hoursAhead(forecast, now, HOURS_SHOWN, HOUR_STEP).map(
    (hour): HourBlock => ({
      time: fmt.hourAtLocation(hour.time, utcOffsetSeconds),
      icon: describeWeather(hour.weatherCode, hour.isDay).icon,
      temperature: fmt.temperature(hour.temperature),
      feelsLike: `feels ${fmt.temperature(hour.apparentTemperature)}`,
      rain: fmt.rainMeasure(hour.rain, units),
      wind: fmt.windMeasure(hour.windSpeed, units, hour.windDirection),
    }),
  );
  return { screen: "hourly", columns: pairUp(hours) };
}

function buildDaily(forecast: Forecast, now: number): DailyScreenModel {
  const { units } = forecast;
  const days = daysAhead(forecast, now, DAYS_SHOWN).map((day): DayBlock => ({
    weekday: fmt.weekdayAndDay(day.date),
    icon: describeWeather(day.weatherCode, true).icon,
    max: fmt.temperature(day.temperatureMax),
    min: fmt.temperature(day.temperatureMin),
    rain: fmt.rainMeasure(day.rainSum, units),
    rainChance:
      day.precipitationProbabilityMax === null
        ? null
        : fmt.percent(day.precipitationProbabilityMax),
    wind: fmt.windMeasure(day.windSpeedMax, units),
  }));
  return { screen: "daily", columns: pairUp(days) };
}

export function buildScreenModel(
  screen: WidgetScreen,
  forecast: Forecast,
  now: number,
): ScreenModel {
  switch (screen) {
    case "current":
      return buildCurrent(forecast, now);
    case "hourly":
      return buildHourly(forecast, now);
    case "daily":
      return buildDaily(forecast, now);
  }
}

export interface ReadyContentInput {
  screen: WidgetScreen;
  slot: string;
  locationName: string;
  forecast: Forecast;
  /** When the forecast was fetched, epoch milliseconds. */
  fetchedAt: number;
  /** The last refresh failed and this is the cached forecast. */
  offline: boolean;
  now: number;
}

export function buildReadyContent(input: ReadyContentInput): WidgetContent {
  const { screen, slot, locationName, forecast, fetchedAt, offline, now } =
    input;
  const isDevice = slot === DEVICE_SLOT;
  const model = buildScreenModel(screen, forecast, now);
  const empty =
    (model.screen === "hourly" && model.columns.length === 0) ||
    (model.screen === "daily" && model.columns.length === 0);

  const updated = fmt.clockOnDevice(fetchedAt);
  return {
    screen,
    isDevice,
    caption: {
      location: locationName,
      isDevice,
      status: offline ? `Offline ${updated}` : updated,
    },
    message: empty
      ? {
          title: "Forecast is out of date",
          detail: "Tap refresh when you are online.",
        }
      : null,
    model: empty ? null : model,
  };
}

export function buildMessageContent(
  screen: WidgetScreen,
  isDevice: boolean,
  caption: WidgetCaption | null,
  message: MessageModel,
): WidgetContent {
  return { screen, isDevice, caption, message, model: null };
}
