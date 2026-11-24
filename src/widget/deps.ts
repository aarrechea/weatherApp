import { loadForecast } from "@/api";
import { DEFAULT_UNITS } from "@/domain";
import { getDeviceLocation } from "@/location";
import { notifier } from "@/notification/notifier";
import {
  forecastCache,
  locationsStore,
  settingsStore,
  widgetScreenStore,
} from "@/storage";

import type { WidgetDeps } from "./widgetData";

/**
 * The app's real storage, location, network and notifications, wired together.
 * Used by the widget task and by the screens that need the same data. Units
 * follow the defaults until the settings screen can change them.
 */
export const widgetDeps: WidgetDeps = {
  locations: locationsStore,
  cache: forecastCache,
  screens: widgetScreenStore,
  getDeviceFix: getDeviceLocation,
  loadForecast,
  now: Date.now,
  units: DEFAULT_UNITS,
  settings: settingsStore,
  notifier,
};
