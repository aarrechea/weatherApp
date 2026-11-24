/** The widget's size as the system reports it, in dp. */
export interface WidgetSize {
  width: number;
  height: number;
}

export const PADDING = 8;
export const CAPTION_HEIGHT = 18;
export const NAV_HEIGHT = 48;

/**
 * The weather area the layout was designed for: the 320 x 250dp minimum size
 * of the widget, without its padding, caption and navigation row.
 */
const DESIGN_WIDTH = 320 - PADDING * 2;
const DESIGN_HEIGHT = 250 - PADDING * 2 - CAPTION_HEIGHT - NAV_HEIGHT;

const MIN_SCALE = 0.8;
const MAX_SCALE = 1.5;

/**
 * How much to enlarge text and icons. A taller or wider widget leaves more
 * room per row and column, so the text grows with it instead of staying small.
 * Whichever direction has the least spare room decides, so nothing overflows.
 */
export function fontScale(size?: WidgetSize): number {
  if (!size || !(size.width > 0) || !(size.height > 0)) return 1;
  const byWidth = (size.width - PADDING * 2) / DESIGN_WIDTH;
  const byHeight =
    (size.height - PADDING * 2 - CAPTION_HEIGHT - NAV_HEIGHT) / DESIGN_HEIGHT;
  const scale = Math.min(byWidth, byHeight);
  return (
    Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)) * 100) / 100
  );
}

/** Returns a function that scales a design size, rounded to a tenth. */
export function zoom(scale: number): (size: number) => number {
  return (size) => Math.round(size * scale * 10) / 10;
}
