import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from "expo-notifications";

import type { NotificationContent, Notifier } from "./types";

/** The one notification this app keeps. Posting it again replaces it. */
export const NOTIFICATION_ID = "current-weather";
export const CHANNEL_ID = "current-weather";

/**
 * Silent on purpose: it is a status display, not an alert. Importance DEFAULT
 * (not LOW) so it is not hidden when the phone is set to show only alerting
 * notifications on the lock screen, with the sound and vibration turned off so
 * it never makes a noise. The channel asks for public lock screen visibility,
 * but Android decides that setting for the user: on a phone that hides
 * sensitive content on the lock screen the notification can show as "Content
 * hidden" until the user allows it in the system notification settings.
 */
async function ensureChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Current weather",
    description: "The current conditions, kept up to date.",
    importance: AndroidImportance.DEFAULT,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    sound: null,
    enableVibrate: false,
    showBadge: false,
  });
}

/**
 * Call once when the app starts, before anything is posted. While the app is
 * open the notification goes into the list only, with no pop-up banner.
 */
export function configureNotificationBehavior(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export const notifier: Notifier = {
  async isAllowed() {
    const permission = await Notifications.getPermissionsAsync();
    return permission.granted;
  },

  async requestPermission() {
    // On Android 13 and later the system prompt only appears once a channel
    // exists, so create it first.
    await ensureChannel();
    const permission = await Notifications.requestPermissionsAsync();
    return permission.granted;
  },

  async show(content: NotificationContent) {
    if (!(await this.isAllowed())) return;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: content.title,
        body: content.body,
        subtitle: content.subtitle,
        sticky: true,
        autoDismiss: false,
        sound: false,
      },
      trigger: { channelId: CHANNEL_ID },
    });
  },

  async clear() {
    await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
  },
};
