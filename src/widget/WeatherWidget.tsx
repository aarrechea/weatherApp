"use no memo";

import { FlexWidget } from "react-native-android-widget";

import type { WidgetContent } from "./model";
import { CurrentScreen, DailyScreen, HourlyScreen } from "./screens";
import { widgetColors, type WidgetColors, type WidgetThemeName } from "./theme";
import {
  CAPTION_HEIGHT,
  NAV_HEIGHT,
  PADDING,
  fontScale,
  type WidgetSize,
} from "./size";
import { Icon, Line } from "./ui";

/** Click actions the widget sends to the task handler. */
export const ACTION_STEP_SCREEN = "STEP_SCREEN";
export const ACTION_NEXT_LOCATION = "NEXT_LOCATION";
export const ACTION_REFRESH = "REFRESH";

function Caption({
  content,
  colors,
}: {
  content: WidgetContent;
  colors: WidgetColors;
}) {
  const caption = content.caption;
  if (caption === null) {
    return (
      <FlexWidget style={{ width: "match_parent", height: CAPTION_HEIGHT }} />
    );
  }
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: CAPTION_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 4,
      }}
    >
      <Icon
        name={caption.isDevice ? "crosshairs-gps" : "map-marker"}
        size={12}
        color={colors.accent}
      />
      <FlexWidget style={{ width: 4, height: 1 }} />
      <FlexWidget style={{ flex: 1, width: 0 }}>
        <Line
          text={caption.location}
          size={11}
          color={colors.text}
          bold
          align="left"
        />
      </FlexWidget>
      <Line
        text={caption.status}
        size={10}
        color={colors.textSecondary}
        align="right"
      />
    </FlexWidget>
  );
}

function Message({
  content,
  colors,
}: {
  content: WidgetContent;
  colors: WidgetColors;
}) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        width: "match_parent",
        height: 0,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
      }}
    >
      <Line
        text={content.message?.title ?? ""}
        size={14}
        color={colors.text}
        bold
      />
      <Line
        text={content.message?.detail ?? ""}
        size={11}
        color={colors.textSecondary}
      />
    </FlexWidget>
  );
}

function Body({
  content,
  colors,
  scale,
}: {
  content: WidgetContent;
  colors: WidgetColors;
  scale: number;
}) {
  const model = content.model;
  if (model === null) return <Message content={content} colors={colors} />;
  switch (model.screen) {
    case "current":
      return <CurrentScreen model={model} colors={colors} scale={scale} />;
    case "hourly":
      return <HourlyScreen model={model} colors={colors} scale={scale} />;
    case "daily":
      return <DailyScreen model={model} colors={colors} scale={scale} />;
  }
}

function NavButton({
  icon,
  colors,
  clickAction,
  clickActionData,
}: {
  icon: string;
  colors: WidgetColors;
  clickAction: string;
  clickActionData?: Record<string, unknown>;
}) {
  return (
    <FlexWidget
      clickAction={clickAction}
      clickActionData={clickActionData}
      style={{
        flex: 1,
        width: 0,
        height: "match_parent",
        margin: 3,
        borderRadius: 14,
        backgroundColor: colors.button,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={icon} size={22} color={colors.buttonIcon} />
    </FlexWidget>
  );
}

/** back, location, (empty), refresh, forward */
function NavRow({
  content,
  colors,
}: {
  content: WidgetContent;
  colors: WidgetColors;
}) {
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: NAV_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <NavButton
        icon="chevron-left"
        colors={colors}
        clickAction={ACTION_STEP_SCREEN}
        clickActionData={{ direction: "back" }}
      />
      <NavButton
        icon={content.isDevice ? "crosshairs-gps" : "map-marker"}
        colors={colors}
        clickAction={ACTION_NEXT_LOCATION}
      />
      <FlexWidget style={{ flex: 1, width: 0, height: "match_parent" }} />
      <NavButton icon="refresh" colors={colors} clickAction={ACTION_REFRESH} />
      <NavButton
        icon="chevron-right"
        colors={colors}
        clickAction={ACTION_STEP_SCREEN}
        clickActionData={{ direction: "forward" }}
      />
    </FlexWidget>
  );
}

/**
 * The 5 x 4 widget: a caption and three rows of weather on top, and a
 * navigation row below. Tapping the weather area opens the app.
 */
export function WeatherWidget({
  content,
  theme,
  size,
  opacity = 100,
}: {
  content: WidgetContent;
  theme: WidgetThemeName;
  /** The widget's size in dp, so the text can grow with it. */
  size?: WidgetSize;
  /** How opaque the background is, in percent. */
  opacity?: number;
}) {
  const colors = widgetColors(theme, opacity);
  const scale = fontScale(size);
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        padding: PADDING,
        borderRadius: 24,
        backgroundColor: colors.background,
      }}
    >
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          flex: 1,
          width: "match_parent",
          height: 0,
          flexDirection: "column",
        }}
      >
        <Caption content={content} colors={colors} />
        <Body content={content} colors={colors} scale={scale} />
      </FlexWidget>
      <NavRow content={content} colors={colors} />
    </FlexWidget>
  );
}

/** The light and dark versions of the widget, as the library wants them. */
export function widgetRepresentation(
  content: WidgetContent,
  size: WidgetSize,
  opacity: number,
) {
  return {
    light: (
      <WeatherWidget
        content={content}
        theme="light"
        size={size}
        opacity={opacity}
      />
    ),
    dark: (
      <WeatherWidget
        content={content}
        theme="dark"
        size={size}
        opacity={opacity}
      />
    ),
  };
}
