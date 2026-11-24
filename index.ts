// Custom entry point: the widget task handler has to be registered before the
// app starts, because Android can run the widget without opening the app.
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { configureNotificationBehavior } from "./src/notification/notifier";
import { widgetTaskHandler } from "./src/widget/widgetTaskHandler";

// Also runs when the widget starts the app without opening it, so the
// notification behaves the same either way.
configureNotificationBehavior();
registerWidgetTaskHandler(widgetTaskHandler);

// Keep this import last, as the widget library's setup guide asks.
import "expo-router/entry";
