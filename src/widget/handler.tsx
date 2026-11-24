import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { DEVICE_SLOT, isWidgetScreen, stepScreen } from "@/domain";
import { updateNotification } from "@/notification/update";

import {
  ACTION_NEXT_LOCATION,
  ACTION_REFRESH,
  ACTION_STEP_SCREEN,
  widgetRepresentation,
} from "./WeatherWidget";
import {
  contentFromLoaded,
  loadSnapshot,
  type LoadMode,
  type WidgetDeps,
} from "./widgetData";

/** The widget's name in the `app.json` plugin settings. */
export const WIDGET_NAME = "Weather";

/**
 * Handles everything the system asks of the widget: being added, the periodic
 * update, a resize, being removed, and taps on the navigation buttons.
 */
export function createWidgetTaskHandler(deps: WidgetDeps) {
  /** The background opacity setting. An unreadable setting means solid. */
  async function opacity(): Promise<number> {
    try {
      return (await deps.settings.get()).widgetOpacity;
    } catch {
      return 100;
    }
  }

  /**
   * Draw the widget. With `notify`, also update the current-weather
   * notification from the same forecast, so the two always agree.
   */
  async function draw(
    props: WidgetTaskHandlerProps,
    mode: LoadMode,
    notify: boolean,
  ): Promise<void> {
    const screen = await deps.screens.get(props.widgetInfo.widgetId);
    const loaded = await loadSnapshot(mode, deps);
    const content = contentFromLoaded(screen, loaded, deps.now());
    const size = {
      width: props.widgetInfo.width,
      height: props.widgetInfo.height,
    };
    props.renderWidget(widgetRepresentation(content, size, await opacity()));
    if (notify) await updateNotification(deps, loaded);
  }

  /** The next place after the selected one: follow me, then saved places. */
  async function selectNextLocation(): Promise<void> {
    const state = await deps.locations.load();
    const ids = [
      ...(state.followMe ? [DEVICE_SLOT] : []),
      ...state.places.map((place) => place.id),
    ];
    if (ids.length < 2) return;
    const next = ids[(ids.indexOf(state.selected) + 1) % ids.length];
    await deps.locations.select(next);
  }

  return async function widgetTaskHandler(
    props: WidgetTaskHandlerProps,
  ): Promise<void> {
    if (props.widgetInfo.widgetName !== WIDGET_NAME) return;
    const widgetId = props.widgetInfo.widgetId;

    switch (props.widgetAction) {
      case "WIDGET_ADDED":
      case "WIDGET_UPDATE":
        await draw(props, "refresh", true);
        return;

      case "WIDGET_RESIZED":
        await draw(props, "cached", false);
        return;

      case "WIDGET_DELETED":
        await deps.screens.remove(widgetId);
        return;

      case "WIDGET_CLICK":
        switch (props.clickAction) {
          case ACTION_STEP_SCREEN: {
            const direction = props.clickActionData?.direction;
            if (direction !== "back" && direction !== "forward") return;
            const current = await deps.screens.get(widgetId);
            const next = stepScreen(
              isWidgetScreen(current) ? current : "current",
              direction,
            );
            await deps.screens.set(widgetId, next);
            await draw(props, "cached", false);
            return;
          }
          case ACTION_NEXT_LOCATION:
            await selectNextLocation();
            await draw(props, "cached", true);
            return;
          case ACTION_REFRESH:
            await draw(props, "refresh", true);
            return;
          default:
            // OPEN_APP is handled by the system and never reaches here.
            return;
        }
    }
  };
}
