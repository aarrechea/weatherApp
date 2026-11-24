/**
 * Codepoints of the MaterialCommunityIcons glyphs the widget uses. The widget
 * draws an icon as text, so it needs the character, not the glyph name.
 *
 * Generated from the glyph map of the installed `@expo/vector-icons`. Keep it
 * small instead of importing the whole map (several thousand glyphs).
 */
const GLYPH_CODEPOINTS = {
  "chevron-left": 983361,
  "chevron-right": 983362,
  "crosshairs-gps": 983460,
  "eye-outline": 984784,
  "map-marker": 983886,
  "navigation-variant": 989424,
  refresh: 984144,
  "thermometer-chevron-down": 986626,
  "thermometer-chevron-up": 986627,
  "water-percent": 984462,
  "umbrella-outline": 984395,
  "weather-cloudy": 984464,
  "weather-cloudy-alert": 986927,
  "weather-fog": 984465,
  "weather-lightning-rainy": 984702,
  "weather-night": 984468,
  "weather-night-partly-cloudy": 986929,
  "weather-partly-cloudy": 984469,
  "weather-pouring": 984470,
  "weather-rainy": 984471,
  "weather-snowy": 984472,
  "weather-snowy-heavy": 986934,
  "weather-snowy-rainy": 984703,
  "weather-sunny": 984473,
  "weather-sunset-down": 984475,
  "weather-sunset-up": 984476,
  "weather-windy": 984477,
  "weather-windy-variant": 984478,
} as const;

export type GlyphName = keyof typeof GLYPH_CODEPOINTS;

/** Font name to register in the plugin and to pass to `IconWidget`. */
export const ICON_FONT = "MaterialCommunityIcons";

export function isGlyphName(name: string): name is GlyphName {
  return name in GLYPH_CODEPOINTS;
}

/** The character to draw for an icon name. Unknown names draw a "cloud alert". */
export function glyph(name: string): string {
  const codepoint = isGlyphName(name)
    ? GLYPH_CODEPOINTS[name]
    : GLYPH_CODEPOINTS["weather-cloudy-alert"];
  return String.fromCodePoint(codepoint);
}

export const GLYPH_NAMES = Object.keys(GLYPH_CODEPOINTS) as GlyphName[];

export function glyphCodepoint(name: GlyphName): number {
  return GLYPH_CODEPOINTS[name];
}
