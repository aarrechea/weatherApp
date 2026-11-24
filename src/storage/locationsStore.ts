import {
  DEVICE_SLOT,
  MAX_SAVED_PLACES,
  distanceKm,
  type DeviceFix,
  type SavedPlace,
} from "@/domain";

import type { KeyValueStore } from "./keyValueStore";

const LOCATIONS_KEY = "locations:v1";

/** Two saved places closer than this are considered the same place. */
const DUPLICATE_DISTANCE_KM = 1;

export interface LocationsState {
  /** Up to `MAX_SAVED_PLACES`, in the order they were added. */
  places: SavedPlace[];
  /** Whether the "follow me" location is on. */
  followMe: boolean;
  /** `DEVICE_SLOT` or the id of a saved place. */
  selected: string;
  /** The last position "follow me" found, for offline use and the widget. */
  lastDeviceFix: DeviceFix | null;
}

export type LocationsChangeError =
  /** Already `MAX_SAVED_PLACES` places saved. */
  | "full"
  /** The same place is already saved. */
  | "duplicate"
  /** The change would leave no location at all. */
  | "last-location"
  | "not-found";

export type LocationsChangeResult =
  | { ok: true; state: LocationsState }
  | { ok: false; error: LocationsChangeError; state: LocationsState };

export interface LocationsStore {
  load(): Promise<LocationsState>;
  addPlace(place: SavedPlace): Promise<LocationsChangeResult>;
  removePlace(id: string): Promise<LocationsChangeResult>;
  setFollowMe(enabled: boolean): Promise<LocationsChangeResult>;
  select(id: string): Promise<LocationsChangeResult>;
  saveDeviceFix(fix: DeviceFix): Promise<LocationsState>;
}

export const DEFAULT_LOCATIONS: LocationsState = {
  places: [],
  followMe: true,
  selected: DEVICE_SLOT,
  lastDeviceFix: null,
};

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parsePlace(value: unknown): SavedPlace | null {
  if (typeof value !== "object" || value === null) return null;
  const p = value as Record<string, unknown>;
  if (
    typeof p.id !== "string" ||
    p.id === "" ||
    p.id === DEVICE_SLOT ||
    typeof p.name !== "string" ||
    !isNumber(p.latitude) ||
    !isNumber(p.longitude)
  ) {
    return null;
  }
  return {
    id: p.id,
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    country: optionalString(p.country),
    countryCode: optionalString(p.countryCode),
    region: optionalString(p.region),
    timezone: optionalString(p.timezone),
  };
}

function parseFix(value: unknown): DeviceFix | null {
  if (typeof value !== "object" || value === null) return null;
  const f = value as Record<string, unknown>;
  if (
    !isNumber(f.latitude) ||
    !isNumber(f.longitude) ||
    !isNumber(f.timestamp)
  ) {
    return null;
  }
  return {
    latitude: f.latitude,
    longitude: f.longitude,
    accuracy: isNumber(f.accuracy) ? f.accuracy : null,
    timestamp: f.timestamp,
  };
}

/**
 * Make a state consistent: no more than the allowed places, no duplicate ids,
 * at least one location available, and a selection that points at one.
 */
function normalize(state: LocationsState): LocationsState {
  const seen = new Set<string>();
  const places = state.places
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .slice(0, MAX_SAVED_PLACES);

  const followMe = state.followMe || places.length === 0;
  const available = new Set<string>(places.map((p) => p.id));
  if (followMe) available.add(DEVICE_SLOT);

  let selected = state.selected;
  if (!available.has(selected)) {
    selected = followMe ? DEVICE_SLOT : places[0].id;
  }

  return { places, followMe, selected, lastDeviceFix: state.lastDeviceFix };
}

function parseState(raw: string | null): LocationsState {
  if (raw === null) return DEFAULT_LOCATIONS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_LOCATIONS;
    const v = value as Record<string, unknown>;
    const places = Array.isArray(v.places)
      ? v.places.map(parsePlace).filter((p): p is SavedPlace => p !== null)
      : [];
    return normalize({
      places,
      followMe: typeof v.followMe === "boolean" ? v.followMe : true,
      selected: typeof v.selected === "string" ? v.selected : DEVICE_SLOT,
      lastDeviceFix: parseFix(v.lastDeviceFix),
    });
  } catch {
    return DEFAULT_LOCATIONS;
  }
}

/**
 * The saved places and the "follow me" setting. Changes are applied one at a
 * time, so quick successive calls cannot overwrite each other.
 */
export function createLocationsStore(store: KeyValueStore): LocationsStore {
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<LocationsState> {
    try {
      return parseState(await store.getItem(LOCATIONS_KEY));
    } catch {
      return DEFAULT_LOCATIONS;
    }
  }

  async function write(state: LocationsState): Promise<void> {
    await store.setItem(LOCATIONS_KEY, JSON.stringify(state));
  }

  /** Run `change` after every earlier change has finished. */
  function update<T>(
    change: (state: LocationsState) => Promise<T>,
  ): Promise<T> {
    const run = queue.then(async () => change(await read()));
    queue = run.catch(() => undefined);
    return run;
  }

  async function apply(
    state: LocationsState,
    next: LocationsState,
  ): Promise<LocationsChangeResult> {
    const normalized = normalize(next);
    await write(normalized);
    return { ok: true, state: normalized };
  }

  const fail = (
    state: LocationsState,
    error: LocationsChangeError,
  ): LocationsChangeResult => ({ ok: false, error, state });

  return {
    load: () => update(async (state) => state),

    addPlace: (place) =>
      update(async (state) => {
        if (state.places.length >= MAX_SAVED_PLACES) {
          return fail(state, "full");
        }
        const duplicate = state.places.some(
          (p) =>
            p.id === place.id ||
            distanceKm(
              p.latitude,
              p.longitude,
              place.latitude,
              place.longitude,
            ) < DUPLICATE_DISTANCE_KM,
        );
        if (duplicate) return fail(state, "duplicate");
        return apply(state, { ...state, places: [...state.places, place] });
      }),

    removePlace: (id) =>
      update(async (state) => {
        if (!state.places.some((p) => p.id === id)) {
          return fail(state, "not-found");
        }
        const places = state.places.filter((p) => p.id !== id);
        if (places.length === 0 && !state.followMe) {
          return fail(state, "last-location");
        }
        return apply(state, { ...state, places });
      }),

    setFollowMe: (enabled) =>
      update(async (state) => {
        if (!enabled && state.places.length === 0) {
          return fail(state, "last-location");
        }
        return apply(state, { ...state, followMe: enabled });
      }),

    select: (id) =>
      update(async (state) => {
        const known =
          (id === DEVICE_SLOT && state.followMe) ||
          state.places.some((p) => p.id === id);
        if (!known) return fail(state, "not-found");
        return apply(state, { ...state, selected: id });
      }),

    saveDeviceFix: (fix) =>
      update(async (state) => {
        const next = { ...state, lastDeviceFix: fix };
        await write(next);
        return next;
      }),
  };
}
