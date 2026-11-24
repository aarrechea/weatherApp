import { describeWeather, rainOutlook, today, type Forecast } from "@/domain";
import * as fmt from "@/widget/format";

import type { NotificationContent } from "./types";

export interface NotificationInput {
  locationName: string;
  forecast: Forecast;
  /** When the forecast was fetched, epoch milliseconds. */
  fetchedAt: number;
  /** The last refresh failed and this is the cached forecast. */
  offline: boolean;
  now: number;
}

/**
 * The text of the current-weather notification, built from the same forecast
 * the widget shows. The rain chance is the one the widget uses: the highest
 * chance for the rest of today.
 */
export function buildNotificationContent(
  input: NotificationInput,
): NotificationContent {
  const { locationName, forecast, fetchedAt, offline, now } = input;
  const { current, units } = forecast;
  const description = describeWeather(current.weatherCode, current.isDay);
  const day = today(forecast, now);
  const outlook = rainOutlook(forecast, now);

  const parts = [`Feels ${fmt.temperature(current.apparentTemperature)}`];
  if (day) {
    parts.push(
      `${fmt.temperature(day.temperatureMax)} / ${fmt.temperature(day.temperatureMin)}`,
    );
  }
  if (outlook && outlook.chance !== null) {
    parts.push(`Rain ${fmt.percent(outlook.chance)}`);
  }
  parts.push(
    `Wind ${fmt.windSpeed(current.windSpeed, units)} ${fmt.compass(current.windDirection)}`,
  );

  const updated = fmt.clockOnDevice(fetchedAt);
  return {
    title: `${fmt.temperature(current.temperature)} ${description.label}`,
    body: parts.join(" · "),
    subtitle: `${locationName} · ${offline ? `offline ${updated}` : updated}`,
  };
}
