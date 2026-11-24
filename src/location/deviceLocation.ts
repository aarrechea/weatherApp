import * as Location from "expo-location";

import type { DeviceFix } from "@/domain";

export type DeviceLocationErrorKind =
  /** The user said no, but can still be asked again. */
  | "permission-denied"
  /** The user said no for good; only system settings can change it. */
  | "permission-blocked"
  /**
   * A background read was requested, but "Allow all the time" was not
   * granted. Callers such as the widget should fall back to the last saved
   * position.
   */
  | "background-permission-missing"
  /** Location is switched off on the device. */
  | "services-disabled"
  /** The device could not work out its position in time. */
  | "timeout"
  | "unavailable";

export class DeviceLocationError extends Error {
  readonly kind: DeviceLocationErrorKind;

  constructor(
    kind: DeviceLocationErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "DeviceLocationError";
    this.kind = kind;
  }
}

export interface DeviceLocationOptions {
  /**
   * Ask for permission when it has not been granted yet. Default true.
   * Ignored when `background` is set: background reads never prompt.
   */
  requestPermission?: boolean;
  /**
   * Read the position while the app is not open, for example from the widget
   * refresh. Needs the "Allow all the time" permission and never shows a
   * prompt. Throws `background-permission-missing` without it.
   */
  background?: boolean;
  /** Reuse a position the system already has if it is newer than this. */
  maxAgeMs?: number;
  /** Give up waiting for a new position after this long. */
  timeoutMs?: number;
}

const DEFAULT_MAX_AGE_MS = 10 * 60_000;
const DEFAULT_TIMEOUT_MS = 20_000;
/**
 * A forecast grid cell is several kilometers wide, so a position that is off
 * by a few kilometers gives the same forecast. This also lets the "approximate
 * location" permission work.
 */
const ACCEPTABLE_ACCURACY_M = 5_000;

function toFix(location: Location.LocationObject): DeviceFix {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    timestamp: location.timestamp,
  };
}

async function ensurePermission(requestPermission: boolean): Promise<void> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted && requestPermission && permission.canAskAgain) {
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (permission.granted) return;
  if (permission.canAskAgain) {
    throw new DeviceLocationError(
      "permission-denied",
      "Location permission was not granted.",
    );
  }
  throw new DeviceLocationError(
    "permission-blocked",
    "Location permission is blocked. Enable it in the system settings.",
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new DeviceLocationError(
            "timeout",
            "Could not determine the location in time.",
          ),
        ),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Where the device is now, accurate to a few kilometers or better. Needs only the foreground
 * location permission, so call it while the app is open. Reuses a recent
 * position from the system when there is one, which is fast and saves power.
 */
export async function getDeviceLocation(
  options: DeviceLocationOptions = {},
): Promise<DeviceFix> {
  const {
    background = false,
    requestPermission: wantPermission = true,
    maxAgeMs = DEFAULT_MAX_AGE_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;
  const requestPermission = wantPermission && !background;

  await ensurePermission(requestPermission);
  if (background) {
    const backgroundPermission = await Location.getBackgroundPermissionsAsync();
    if (!backgroundPermission.granted) {
      throw new DeviceLocationError(
        "background-permission-missing",
        'Background location needs the "Allow all the time" permission.',
      );
    }
  }

  if (!(await Location.hasServicesEnabledAsync())) {
    throw new DeviceLocationError(
      "services-disabled",
      "Location is turned off on this device.",
    );
  }

  try {
    const known = await Location.getLastKnownPositionAsync({
      maxAge: maxAgeMs,
      requiredAccuracy: ACCEPTABLE_ACCURACY_M,
    });
    if (known) return toFix(known);

    const current = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: false,
      }),
      timeoutMs,
    );
    return toFix(current);
  } catch (cause) {
    if (cause instanceof DeviceLocationError) throw cause;
    throw new DeviceLocationError(
      "unavailable",
      "Could not determine the location.",
      { cause },
    );
  }
}

/**
 * - `granted`: "Allow all the time", so the widget can read the position.
 * - `foreground-only`: allowed only while the app is open.
 * - `denied`: no location permission at all.
 */
export type BackgroundLocationStatus = "granted" | "foreground-only" | "denied";

export async function getBackgroundLocationStatus(): Promise<BackgroundLocationStatus> {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) return "denied";
  const background = await Location.getBackgroundPermissionsAsync();
  return background.granted ? "granted" : "foreground-only";
}

/**
 * Ask for "Allow all the time". Android only allows this after the foreground
 * permission, and on Android 11 and later it opens the system settings page,
 * so explain why before calling it. Returns `foreground-only` when the user
 * came back without allowing it. Throws if the foreground permission is
 * refused.
 */
export async function requestBackgroundLocation(): Promise<BackgroundLocationStatus> {
  await ensurePermission(true);
  const current = await Location.getBackgroundPermissionsAsync();
  if (current.granted) return "granted";
  const result = await Location.requestBackgroundPermissionsAsync();
  return result.granted ? "granted" : "foreground-only";
}
