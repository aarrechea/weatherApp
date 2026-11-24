"use no memo";

import {
  FlexWidget,
  IconWidget,
  TextWidget,
  type ColorProp,
} from "react-native-android-widget";

import { ICON_FONT, glyph } from "./glyphs";
import type { WidgetColors } from "./theme";

/**
 * Small building blocks for the widget. Widgets must be plain functions that
 * return the library's primitives: no hooks, no React Native View or Text.
 */

interface TextProps {
  text: string;
  size: number;
  color: ColorProp;
  bold?: boolean;
  align?: "left" | "center" | "right";
}

/** One line of text that never scales with the system font size. */
export function Line({ text, size, color, bold, align = "center" }: TextProps) {
  return (
    <TextWidget
      text={text}
      maxLines={1}
      truncate="END"
      allowFontScaling={false}
      style={{
        fontSize: size,
        color,
        fontWeight: bold ? "bold" : "normal",
        textAlign: align,
      }}
    />
  );
}

interface IconProps {
  name: string;
  size: number;
  color: ColorProp;
}

export function Icon({ name, size, color }: IconProps) {
  return (
    <IconWidget
      icon={glyph(name)}
      font={ICON_FONT}
      size={size}
      style={{ color }}
    />
  );
}

/** An icon followed by text, on one line. */
export function IconText({
  icon,
  text,
  size,
  colors,
  bold,
  iconSize,
}: {
  icon: string;
  text: string;
  size: number;
  colors: WidgetColors;
  bold?: boolean;
  /** Defaults to a little larger than the text. */
  iconSize?: number;
}) {
  return (
    <HRow>
      <Icon
        name={icon}
        size={iconSize ?? Math.round(size * 1.15 * 10) / 10}
        color={colors.accent}
      />
      <Spacer width={Math.round(size * 0.3)} />
      <Line text={text} size={size} color={colors.text} bold={bold} />
    </HRow>
  );
}

/** An amount with its unit on the line below. */
export function Measured({
  amount,
  unit,
  amountSize,
  unitSize,
  colors,
}: {
  amount: string;
  unit: string;
  amountSize: number;
  unitSize: number;
  colors: WidgetColors;
}) {
  return (
    <FlexWidget style={{ flexDirection: "column", alignItems: "center" }}>
      <Line text={amount} size={amountSize} color={colors.text} bold />
      <Line text={unit} size={unitSize} color={colors.textSecondary} />
    </FlexWidget>
  );
}

/** Items side by side, centered. */
export function HRow({ children }: { children?: any }) {
  return (
    <FlexWidget
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </FlexWidget>
  );
}

export function Spacer({
  width = 1,
  height = 1,
}: {
  width?: number;
  height?: number;
}) {
  return <FlexWidget style={{ width, height }} />;
}

/** A thin line across the full width. */
export function Divider({ colors }: { colors: WidgetColors }) {
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: 1,
        marginHorizontal: 4,
        backgroundColor: colors.divider,
      }}
    />
  );
}

/**
 * A row that splits its width between its columns by their weights. A weighted
 * box must have a zero size along the axis it is weighted on: with
 * "match_parent" Android shrinks the heavier box more, which reverses a 3:2
 * split.
 */
export function EvenRow({ children }: { children?: any }) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        width: "match_parent",
        height: 0,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {children}
    </FlexWidget>
  );
}

/** One column of a row, with its content stacked and centered. */
export function Column({
  children,
  weight = 1,
}: {
  children?: any;
  weight?: number;
}) {
  return (
    <FlexWidget
      style={{
        flex: weight,
        width: 0,
        height: "match_parent",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </FlexWidget>
  );
}
