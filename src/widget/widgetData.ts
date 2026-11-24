import {
  DEVICE_LOCATION_NAME,
  DEVICE_SLOT,
  resolveDeviceFix,
  resolveSavedPlace,
  type DeviceFix,
  type Forecast,
  type ResolvedLocation,
  type Units,
  type WidgetScreen,
} from "@/domain";
import type { LoadedForecast } from "@/api";
import type { DeviceLocationOptions } from "@/location";
import type { Notifier } from "@/notification/types";
import type {
  ForecastCache,
  LocationsStore,
  SettingsStore,
  WidgetScreenStore,
} from "@/storage";

import {
  buildMessageContent,
  buildReadyContent,
  type MessageModel,
  type WidgetCaption,
  type WidgetContent,
} from "./model";

/**
 * Works out what the widget shows: which location, which forecast, and what to
 * say when there is none. Everything it needs is passed in, so it can be
 * tested without a phone.
 */

export interface WidgetDeps {
  locations: LocationsStore;
  cache: ForecastCache;
  screens: WidgetScreenStore;
  getDeviceFix: (options: DeviceLocationOptions) => Promise<DeviceFix>;
  loadForecast: (
    location: ResolvedLocation,
    options: { units: Units },
    cache: ForecastCache,
  ) => Promise<LoadedForecast>;
  now: () => number;
  units: Units;
  /** App settings, for the current-weather notification switch. */
  settings: SettingsStore;
  /** Posts the current-weather notification. */
  notifier: Notifier;
}

/**
 * - `refresh`: ask for a new position and a new forecast. If the network fails
 *   the cached forecast is shown, marked offline.
 * - `cached`: show what is already stored, and only go online when nothing is.
 *   Used for button taps that just change the view.
 */
export type LoadMode = "refresh" | "cached";

/** How long the widget waits for a position before using the saved one. */
export const DEVICE_TIMEOUT_MS = 8_000;

function locationMessage(error: unknown): MessageModel {
  const kind =
    typeof error === "object" && error !== null && "kind" in error
      ? (error as { kind: unknown }).kind
      : undefined;
  switch (kind) {
    case "background-permission-missing":
    case "permission-denied":
    case "permission-blocked":
      return {
        title: "Location not allowed",
        detail: 'Open the app and choose "Allow all the time".',
      };
    case "services-disabled":
      return {
        title: "Location is off",
        detail: "Turn on location on your phone.",
      };
    default:
      return {
        title: "No location yet",
        detail: "Tap refresh to try again.",
      };
  }
}

function forecastMessage(error: unknown): MessageModel {
  const detail =
    error instanceof Error && error.message
      ? error.message
      : "Tap refresh to try again.";
  return { title: "No forecast", detail };
}

interface ResolvedPlace {
  location: ResolvedLocation | null;
  error: unknown;
}

async function resolveLocation(
  deps: WidgetDeps,
  mode: LoadMode,
): Promise<ResolvedPlace> {
  const state = await deps.locations.load();

  if (state.selected !== DEVICE_SLOT) {
    const place = state.places.find((p) => p.id === state.selected);
    return {
      location: place ? resolveSavedPlace(place) : null,
      error: undefined,
    };
  }

  let fix = state.lastDeviceFix;
  let error: unknown;
  if (mode === "refresh" || fix === null) {
    try {
      fix = await deps.getDeviceFix({
        background: true,
        timeoutMs: DEVICE_TIMEOUT_MS,
      });
      await deps.locations.saveDeviceFix(fix);
    } catch (cause) {
      // Keep the last known position if there is one.
      error = cause;
    }
  }
  return { location: fix ? resolveDeviceFix(fix) : null, error };
}

/** The forecast chosen for display, with where it is for and where it is from. */
export interface Snapshot {
  location: ResolvedLocation;
  /** Whether this is the follow me location. */
  isDevice: boolean;
  forecast: Forecast;
  /** When the forecast was fetched, epoch milliseconds. */
  fetchedAt: number;
  /** The last refresh failed and this is the cached forecast. */
  offline: boolean;
}

export type Loaded =
  | { ok: true; snapshot: Snapshot }
  | {
      ok: false;
      isDevice: boolean;
      caption: WidgetCaption | null;
      message: MessageModel;
    };

function failure(
  isDevice: boolean,
  caption: WidgetCaption | null,
  message: MessageModel,
): Loaded {
  return { ok: false, isDevice, caption, message };
}

/**
 * Work out which location is selected and get its forecast, or say why there
 * is none. Shared by the widget and the notification. Never throws.
 */
export async function loadSnapshot(
  mode: LoadMode,
  deps: WidgetDeps,
): Promise<Loaded> {
  try {
    const { location, error } = await resolveLocation(deps, mode);
    const state = await deps.locations.load();
    const isDevice = state.selected === DEVICE_SLOT;

    if (location === null) {
      return failure(
        isDevice,
        isDevice
          ? { location: DEVICE_LOCATION_NAME, isDevice, status: "" }
          : null,
        isDevice
          ? locationMessage(error)
          : { title: "No location", detail: "Open the app to add a place." },
      );
    }

    if (mode === "cached") {
      const hit = await deps.cache.get(
        location.slot,
        location.latitude,
        location.longitude,
      );
      if (hit !== null) {
        return {
          ok: true,
          snapshot: {
            location,
            isDevice,
            forecast: hit.forecast,
            fetchedAt: hit.fetchedAt,
            offline: false,
          },
        };
      }
    }

    try {
      const loaded = await deps.loadForecast(
        location,
        { units: deps.units },
        deps.cache,
      );
      return {
        ok: true,
        snapshot: {
          location,
          isDevice,
          forecast: loaded.forecast,
          fetchedAt: loaded.fetchedAt,
          offline: loaded.source === "cache",
        },
      };
    } catch (cause) {
      return failure(
        isDevice,
        { location: location.name, isDevice, status: "" },
        forecastMessage(cause),
      );
    }
  } catch (cause) {
    return failure(false, null, forecastMessage(cause));
  }
}

/** What to draw on one screen of the widget for a loaded snapshot. */
export function contentFromLoaded(
  screen: WidgetScreen,
  loaded: Loaded,
  now: number,
): WidgetContent {
  if (!loaded.ok) {
    return buildMessageContent(
      screen,
      loaded.isDevice,
      loaded.caption,
      loaded.message,
    );
  }
  const { snapshot } = loaded;
  return buildReadyContent({
    screen,
    slot: snapshot.location.slot,
    locationName: snapshot.location.name,
    forecast: snapshot.forecast,
    fetchedAt: snapshot.fetchedAt,
    offline: snapshot.offline,
    now,
  });
}

/** The content to draw for one widget instance. Never throws. */
export async function buildWidgetContent(
  widgetId: number,
  mode: LoadMode,
  deps: WidgetDeps,
): Promise<WidgetContent> {
  const screen = await deps.screens.get(widgetId);
  const loaded = await loadSnapshot(mode, deps);
  return contentFromLoaded(screen, loaded, deps.now());
}
