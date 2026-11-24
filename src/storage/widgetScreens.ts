import {
  DEFAULT_WIDGET_SCREEN,
  isWidgetScreen,
  type WidgetScreen,
} from "@/domain";

import type { KeyValueStore } from "./keyValueStore";

/**
 * Which screen each widget instance shows. The widget task keeps no state of
 * its own, so this is what makes back and forward remember where they are.
 */
export interface WidgetScreenStore {
  get(widgetId: number): Promise<WidgetScreen>;
  set(widgetId: number, screen: WidgetScreen): Promise<void>;
  remove(widgetId: number): Promise<void>;
}

function keyFor(widgetId: number): string {
  return `widget:${widgetId}:screen`;
}

export function createWidgetScreenStore(
  store: KeyValueStore,
): WidgetScreenStore {
  return {
    async get(widgetId) {
      try {
        const value = await store.getItem(keyFor(widgetId));
        return isWidgetScreen(value) ? value : DEFAULT_WIDGET_SCREEN;
      } catch {
        return DEFAULT_WIDGET_SCREEN;
      }
    },
    async set(widgetId, screen) {
      try {
        await store.setItem(keyFor(widgetId), screen);
      } catch {
        // Losing the screen only means the widget shows "current" next time.
      }
    },
    async remove(widgetId) {
      try {
        await store.removeItem(keyFor(widgetId));
      } catch {
        // Nothing useful to do.
      }
    },
  };
}
