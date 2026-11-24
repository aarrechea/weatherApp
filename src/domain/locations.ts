import type { GeoLocation } from "./forecast";

/** Slot (and selection id) of the "follow me" location. */
export const DEVICE_SLOT = "device";

/** How many places can be saved besides "follow me". */
export const MAX_SAVED_PLACES = 3;

/** A place the user saved from city search. */
export interface SavedPlace {
  /** Never `DEVICE_SLOT`. Comes from the geocoding provider's id. */
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
  region?: string;
  timezone?: string;
}

/** Where the device was last seen. */
export interface DeviceFix {
  latitude: number;
  longitude: number;
  /** Radius of uncertainty in meters, when known. */
  accuracy: number | null;
  /** When the position was taken, epoch milliseconds. */
  timestamp: number;
}

/**
 * A place a forecast can be loaded for. `slot` identifies it for caching:
 * `DEVICE_SLOT` for "follow me", otherwise the saved place's id.
 */
export interface ResolvedLocation {
  slot: string;
  name: string;
  latitude: number;
  longitude: number;
}

export const DEVICE_LOCATION_NAME = "Current location";

export function savedPlaceFromGeoLocation(place: GeoLocation): SavedPlace {
  return {
    id: String(place.id),
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    country: place.country,
    countryCode: place.countryCode,
    region: place.region,
    timezone: place.timezone,
  };
}

export function resolveSavedPlace(place: SavedPlace): ResolvedLocation {
  return {
    slot: place.id,
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

export function resolveDeviceFix(fix: DeviceFix): ResolvedLocation {
  return {
    slot: DEVICE_SLOT,
    name: DEVICE_LOCATION_NAME,
    latitude: fix.latitude,
    longitude: fix.longitude,
  };
}
