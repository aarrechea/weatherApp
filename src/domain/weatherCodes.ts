import type { Condition } from "./forecast";

export interface WeatherDescription {
  condition: Condition;
  label: string;
  /** A MaterialCommunityIcons glyph name. */
  icon: string;
}

interface CodeInfo {
  condition: Condition;
  label: string;
}

/** WMO weather interpretation codes, as used by Open-Meteo. */
const WMO_CODES: Record<number, CodeInfo> = {
  0: { condition: "clear", label: "Clear sky" },
  1: { condition: "clear", label: "Mainly clear" },
  2: { condition: "partly-cloudy", label: "Partly cloudy" },
  3: { condition: "cloudy", label: "Overcast" },
  45: { condition: "fog", label: "Fog" },
  48: { condition: "fog", label: "Rime fog" },
  51: { condition: "drizzle", label: "Light drizzle" },
  53: { condition: "drizzle", label: "Drizzle" },
  55: { condition: "drizzle", label: "Dense drizzle" },
  56: { condition: "freezing-rain", label: "Light freezing drizzle" },
  57: { condition: "freezing-rain", label: "Freezing drizzle" },
  61: { condition: "rain", label: "Light rain" },
  63: { condition: "rain", label: "Rain" },
  65: { condition: "rain", label: "Heavy rain" },
  66: { condition: "freezing-rain", label: "Light freezing rain" },
  67: { condition: "freezing-rain", label: "Freezing rain" },
  71: { condition: "snow", label: "Light snow" },
  73: { condition: "snow", label: "Snow" },
  75: { condition: "snow", label: "Heavy snow" },
  77: { condition: "snow", label: "Snow grains" },
  80: { condition: "rain", label: "Light rain showers" },
  81: { condition: "rain", label: "Rain showers" },
  82: { condition: "rain", label: "Violent rain showers" },
  85: { condition: "snow", label: "Light snow showers" },
  86: { condition: "snow", label: "Heavy snow showers" },
  95: { condition: "thunderstorm", label: "Thunderstorm" },
  96: { condition: "thunderstorm", label: "Thunderstorm with hail" },
  99: { condition: "thunderstorm", label: "Thunderstorm with heavy hail" },
};

const UNKNOWN: CodeInfo = { condition: "unknown", label: "Unknown" };

/** Codes that deserve a heavier icon than their condition's default. */
const HEAVY_RAIN_CODES = new Set([65, 82]);
const HEAVY_SNOW_CODES = new Set([75, 86]);

export function conditionFromCode(code: number): Condition {
  return (WMO_CODES[code] ?? UNKNOWN).condition;
}

export function iconFor(
  condition: Condition,
  isDay: boolean,
  code?: number,
): string {
  switch (condition) {
    case "clear":
      return isDay ? "weather-sunny" : "weather-night";
    case "partly-cloudy":
      return isDay ? "weather-partly-cloudy" : "weather-night-partly-cloudy";
    case "cloudy":
      return "weather-cloudy";
    case "fog":
      return "weather-fog";
    case "drizzle":
      return "weather-rainy";
    case "rain":
      return code !== undefined && HEAVY_RAIN_CODES.has(code)
        ? "weather-pouring"
        : "weather-rainy";
    case "freezing-rain":
      return "weather-snowy-rainy";
    case "snow":
      return code !== undefined && HEAVY_SNOW_CODES.has(code)
        ? "weather-snowy-heavy"
        : "weather-snowy";
    case "thunderstorm":
      return "weather-lightning-rainy";
    case "unknown":
      return "weather-cloudy-alert";
  }
}

/** Condition, human readable label and icon for a WMO weather code. */
export function describeWeather(
  code: number,
  isDay: boolean = true,
): WeatherDescription {
  const info = WMO_CODES[code] ?? UNKNOWN;
  return {
    condition: info.condition,
    label: info.label,
    icon: iconFor(info.condition, isDay, code),
  };
}
