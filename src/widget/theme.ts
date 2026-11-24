import type { ColorProp } from "react-native-android-widget";

export type WidgetThemeName = "light" | "dark";

export interface WidgetColors {
  background: ColorProp;
  text: ColorProp;
  textSecondary: ColorProp;
  accent: ColorProp;
  button: ColorProp;
  buttonIcon: ColorProp;
  divider: ColorProp;
}

/**
 * Material 3 baseline colors, matching the app's Paper theme. They are written
 * out as hex because the widget library does not accept `rgb(...)`, which is
 * the format Paper's theme uses.
 */
export const WIDGET_COLORS: Record<WidgetThemeName, WidgetColors> = {
  light: {
    background: "#FEF7FF",
    text: "#1D1B20",
    textSecondary: "#49454F",
    accent: "#6750A4",
    button: "#E8DEF8",
    buttonIcon: "#1D192B",
    divider: "#CAC4D0",
  },
  dark: {
    background: "#141218",
    text: "#E6E0E9",
    textSecondary: "#CAC4D0",
    accent: "#D0BCFF",
    button: "#4A4458",
    buttonIcon: "#E8DEF8",
    divider: "#49454F",
  },
};

/**
 * The buttons and the divider never get fainter than this, so the navigation
 * row stays visible when the background is made very see-through.
 */
export const SOLID_PART_MIN_OPACITY = 0.6;

/** `#RRGGBB` with an alpha from 0 (invisible) to 1 (solid). */
function withAlpha(hex: string, alpha: number): ColorProp {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`;
}

/**
 * The widget colors for a theme at a background opacity in percent. At 100 it
 * is exactly the plain theme. Below that the background gets that opacity, the
 * buttons and divider get it too but not below `SOLID_PART_MIN_OPACITY`, and
 * text and icons always stay solid.
 */
export function widgetColors(
  theme: WidgetThemeName,
  opacityPercent: number,
): WidgetColors {
  const colors = WIDGET_COLORS[theme];
  if (opacityPercent >= 100) return colors;
  const alpha = Math.max(0, opacityPercent) / 100;
  const partsAlpha = Math.max(alpha, SOLID_PART_MIN_OPACITY);
  return {
    ...colors,
    background: withAlpha(colors.background as string, alpha),
    button: withAlpha(colors.button as string, partsAlpha),
    divider: withAlpha(colors.divider as string, partsAlpha),
  };
}
