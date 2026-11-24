import { asyncStorageStore } from "./asyncStorageStore";
import { createForecastCache } from "./forecastCache";
import { createLocationsStore } from "./locationsStore";
import { createSettingsStore } from "./settingsStore";
import { createWidgetScreenStore } from "./widgetScreens";

export { createForecastCache } from "./forecastCache";
export type { CachedForecast, ForecastCache } from "./forecastCache";
export { createMemoryStore } from "./keyValueStore";
export {
  DEFAULT_SETTINGS,
  WIDGET_OPACITY_STEPS,
  createSettingsStore,
} from "./settingsStore";
export type { AppSettings, SettingsStore } from "./settingsStore";
export type { KeyValueStore } from "./keyValueStore";
export { DEFAULT_LOCATIONS, createLocationsStore } from "./locationsStore";
export type {
  LocationsChangeError,
  LocationsChangeResult,
  LocationsState,
  LocationsStore,
} from "./locationsStore";

export { createWidgetScreenStore } from "./widgetScreens";
export type { WidgetScreenStore } from "./widgetScreens";

/** The app's persistent store. Change this one line to switch to MMKV. */
export const store = asyncStorageStore;

export const forecastCache = createForecastCache(store);
export const locationsStore = createLocationsStore(store);
export const widgetScreenStore = createWidgetScreenStore(store);
export const settingsStore = createSettingsStore(store);
