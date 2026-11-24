import { requestWidgetUpdate } from "react-native-android-widget";

import { WIDGET_NAME } from "./handler";
import { widgetRepresentation } from "./WeatherWidget";
import { contentFromLoaded, loadSnapshot, type WidgetDeps } from "./widgetData";

/**
 * Redraw every widget on the home screen now, from the stored forecast and the
 * current settings. For the app, so a change in Settings shows straight away
 * instead of at the next refresh. Never throws: with no widget on the home
 * screen there is simply nothing to do.
 */
export async function redrawWidgets(deps: WidgetDeps): Promise<void> {
  try {
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: async (info) => {
        const screen = await deps.screens.get(info.widgetId);
        const loaded = await loadSnapshot("cached", deps);
        const content = contentFromLoaded(screen, loaded, deps.now());
        let opacity = 100;
        try {
          opacity = (await deps.settings.get()).widgetOpacity;
        } catch {
          // An unreadable setting means a solid background.
        }
        return widgetRepresentation(
          content,
          { width: info.width, height: info.height },
          opacity,
        );
      },
    });
  } catch {
    // No widget on the home screen, or the update failed. Nothing to do.
  }
}
