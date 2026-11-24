import {
  loadSnapshot,
  type Loaded,
  type WidgetDeps,
} from "@/widget/widgetData";

import { buildNotificationContent } from "./content";

type NotificationDeps = Pick<WidgetDeps, "settings" | "notifier" | "now">;

/**
 * Post the current-weather notification for a loaded forecast, if the user
 * has turned it on. When there is no forecast the old notification is left as
 * it is. Never throws: a notification problem must not break the widget.
 */
export async function updateNotification(
  deps: NotificationDeps,
  loaded: Loaded,
): Promise<void> {
  try {
    if (!loaded.ok) return;
    const settings = await deps.settings.get();
    if (!settings.ongoingNotification) return;
    const { snapshot } = loaded;
    await deps.notifier.show(
      buildNotificationContent({
        locationName: snapshot.location.name,
        forecast: snapshot.forecast,
        fetchedAt: snapshot.fetchedAt,
        offline: snapshot.offline,
        now: deps.now(),
      }),
    );
  } catch {
    // Nothing useful to do; the widget goes on regardless.
  }
}

/**
 * Get a fresh forecast and post the notification now, if it is turned on.
 * For the app: when the switch is flipped and when the app opens.
 */
export async function refreshNotification(deps: WidgetDeps): Promise<void> {
  try {
    const settings = await deps.settings.get();
    if (!settings.ongoingNotification) return;
    await updateNotification(deps, await loadSnapshot("refresh", deps));
  } catch {
    // Same as above.
  }
}
