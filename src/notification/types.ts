/** What the current-weather notification says. */
export interface NotificationContent {
  /** The temperature and condition, for example "2° Light rain". */
  title: string;
  /** Feels-like, max and min, rain chance and wind. */
  body: string;
  /** The place and when the data was fetched. Shown next to the app name. */
  subtitle: string;
}

/** The part of the system that posts the notification. */
export interface Notifier {
  /** Whether the system lets this app post notifications. */
  isAllowed(): Promise<boolean>;
  /** Ask the user. Resolves to whether permission is now granted. */
  requestPermission(): Promise<boolean>;
  /** Post the notification, or replace the one already posted. */
  show(content: NotificationContent): Promise<void>;
  /** Remove the notification. */
  clear(): Promise<void>;
}
