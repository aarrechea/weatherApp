/** The screens the widget cycles through with its back and forward buttons. */
export const WIDGET_SCREENS = ["current", "hourly", "daily"] as const;

export type WidgetScreen = (typeof WIDGET_SCREENS)[number];

export const DEFAULT_WIDGET_SCREEN: WidgetScreen = "current";

export type WidgetDirection = "back" | "forward";

export function isWidgetScreen(value: unknown): value is WidgetScreen {
  return (WIDGET_SCREENS as readonly unknown[]).includes(value);
}

/**
 * The screen before or after `screen`, wrapping around: forward from the last
 * screen goes to the first, and back from the first goes to the last.
 */
export function stepScreen(
  screen: WidgetScreen,
  direction: WidgetDirection,
): WidgetScreen {
  const count = WIDGET_SCREENS.length;
  const index = WIDGET_SCREENS.indexOf(screen);
  const next = (index + (direction === "forward" ? 1 : -1) + count) % count;
  return WIDGET_SCREENS[next];
}
