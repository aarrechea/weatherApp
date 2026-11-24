import type { KeyValueStore } from "./keyValueStore";

const SETTINGS_KEY = "settings:v1";

/** The opacity levels the widget background can have, in percent. */
export const WIDGET_OPACITY_STEPS = [100, 90, 80, 70, 60, 50] as const;

/**
 * Levels that used to exist and were saved by earlier versions. They map to
 * the nearest level that exists now, so someone who chose a very see-through
 * widget keeps a see-through widget instead of being reset to solid.
 */
const LEGACY_OPACITY: Record<number, number> = { 40: 50, 20: 50 };

function parseOpacity(value: unknown): number {
  if ((WIDGET_OPACITY_STEPS as readonly unknown[]).includes(value)) {
    return value as number;
  }
  if (typeof value === "number" && value in LEGACY_OPACITY) {
    return LEGACY_OPACITY[value];
  }
  return 100;
}

export interface AppSettings {
  /** Keep a notification with the current weather, also on the lock screen. */
  ongoingNotification: boolean;
  /** How opaque the widget background is, one of `WIDGET_OPACITY_STEPS`. */
  widgetOpacity: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ongoingNotification: false,
  widgetOpacity: 100,
};

export interface SettingsStore {
  get(): Promise<AppSettings>;
  /** Change some settings and return all of them. */
  update(change: Partial<AppSettings>): Promise<AppSettings>;
}

function parseSettings(raw: string | null): AppSettings {
  if (raw === null) return DEFAULT_SETTINGS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_SETTINGS;
    const v = value as Record<string, unknown>;
    return {
      ongoingNotification:
        typeof v.ongoingNotification === "boolean"
          ? v.ongoingNotification
          : DEFAULT_SETTINGS.ongoingNotification,
      widgetOpacity: parseOpacity(v.widgetOpacity),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Reads never throw: unreadable settings are the defaults. */
export function createSettingsStore(store: KeyValueStore): SettingsStore {
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<AppSettings> {
    try {
      return parseSettings(await store.getItem(SETTINGS_KEY));
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  return {
    get: read,
    update(change) {
      // One change at a time, so two quick changes cannot overwrite each other.
      const run = queue.then(async () => {
        const next = { ...(await read()), ...change };
        await store.setItem(SETTINGS_KEY, JSON.stringify(next));
        return next;
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
