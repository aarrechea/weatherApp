import { createWidgetTaskHandler } from "./handler";
import { widgetDeps } from "./deps";

/** The widget task handler with the app's real dependencies. Registered in `index.ts`. */
export const widgetTaskHandler = createWidgetTaskHandler(widgetDeps);
