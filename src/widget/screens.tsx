"use no memo";

import { FlexWidget } from "react-native-android-widget";

import type {
  Cell,
  CurrentScreenModel,
  DailyScreenModel,
  DayBlock,
  HourBlock,
  HourlyScreenModel,
} from "./model";
import { zoom } from "./size";
import type { WidgetColors } from "./theme";
import {
  Column,
  Divider,
  EvenRow,
  HRow,
  Icon,
  IconText,
  Line,
  Measured,
  Spacer,
} from "./ui";

/**
 * The weather information above the navigation row. Every screen is a grid
 * where two neighbouring items share one column, stacked one above the other,
 * so there are fewer, wider columns and the text can be bigger.
 */

interface ScreenProps<Model> {
  model: Model;
  colors: WidgetColors;
  /** From `fontScale`: how much larger than the design size to draw. */
  scale: number;
}

function Rows({ children }: { children?: any }) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        width: "match_parent",
        height: 0,
        flexDirection: "column",
      }}
    >
      {children}
    </FlexWidget>
  );
}

/** Up to two cells stacked in one column. */
function CellColumn({
  cells,
  colors,
  size,
  weight,
}: {
  cells: (Cell | null)[];
  colors: WidgetColors;
  size: number;
  weight?: number;
}) {
  return (
    <Column weight={weight}>
      {cells.map((cell) =>
        cell ? (
          <IconText
            key={cell.icon}
            icon={cell.icon}
            text={cell.text}
            size={size}
            colors={colors}
          />
        ) : null,
      )}
    </Column>
  );
}

export function CurrentScreen({
  model,
  colors,
  scale,
}: ScreenProps<CurrentScreenModel>) {
  const z = zoom(scale);
  return (
    <Rows>
      <EvenRow>
        <Column weight={3}>
          <HRow>
            <Icon name={model.icon} size={z(30)} color={colors.accent} />
            <Spacer width={z(6)} />
            <Line
              text={model.temperature}
              size={z(30)}
              color={colors.text}
              bold
            />
            <Spacer width={z(8)} />
            <FlexWidget style={{ flexDirection: "column" }}>
              <Line
                text={model.condition}
                size={z(13)}
                color={colors.text}
                bold
                align="left"
              />
              <Line
                text={model.feelsLike}
                size={z(11)}
                color={colors.textSecondary}
                align="left"
              />
            </FlexWidget>
          </HRow>
        </Column>
        <CellColumn
          cells={[model.max, model.min]}
          colors={colors}
          size={z(20)}
          weight={2}
        />
      </EvenRow>
      <EvenRow>
        {model.grid.slice(0, 3).map((cells, index) => (
          <CellColumn key={index} cells={cells} colors={colors} size={z(16)} />
        ))}
      </EvenRow>
      <EvenRow>
        {model.grid.slice(3, 6).map((cells, index) => (
          <CellColumn key={index} cells={cells} colors={colors} size={z(16)} />
        ))}
      </EvenRow>
    </Rows>
  );
}

function HourCell({
  block,
  colors,
  z,
}: {
  block: HourBlock;
  colors: WidgetColors;
  z: (size: number) => number;
}) {
  return (
    <Column>
      <HRow>
        <Line text={block.time} size={z(12)} color={colors.textSecondary} />
        <Spacer width={z(5)} />
        <Icon name={block.icon} size={z(19)} color={colors.accent} />
      </HRow>
      <HRow>
        <Line text={block.temperature} size={z(19)} color={colors.text} bold />
        <Spacer width={z(5)} />
        <Line text={block.feelsLike} size={z(9)} color={colors.textSecondary} />
      </HRow>
      <HRow>
        <Measured
          amount={block.rain.amount}
          unit={block.rain.unit}
          amountSize={z(15)}
          unitSize={z(9)}
          colors={colors}
        />
        <Spacer width={z(10)} />
        <Measured
          amount={block.wind.amount}
          unit={block.wind.unit}
          amountSize={z(15)}
          unitSize={z(9)}
          colors={colors}
        />
      </HRow>
    </Column>
  );
}

export function HourlyScreen({
  model,
  colors,
  scale,
}: ScreenProps<HourlyScreenModel>) {
  const z = zoom(scale);
  return (
    <Rows>
      <EvenRow>
        {model.columns.map((pair) => (
          <HourCell key={pair[0].time} block={pair[0]} colors={colors} z={z} />
        ))}
      </EvenRow>
      <Divider colors={colors} />
      <EvenRow>
        {model.columns.map((pair) =>
          pair[1] ? (
            <HourCell
              key={pair[1].time}
              block={pair[1]}
              colors={colors}
              z={z}
            />
          ) : (
            <Column key={`${pair[0].time}-free`} />
          ),
        )}
      </EvenRow>
    </Rows>
  );
}

function DayCell({
  block,
  colors,
  z,
}: {
  block: DayBlock;
  colors: WidgetColors;
  z: (size: number) => number;
}) {
  return (
    <Column>
      <HRow>
        <Line text={block.weekday} size={z(11)} color={colors.textSecondary} />
        <Spacer width={z(4)} />
        <Icon name={block.icon} size={z(15)} color={colors.accent} />
      </HRow>
      <HRow>
        <Line text={block.max} size={z(17)} color={colors.text} bold />
        <Spacer width={z(4)} />
        <Line text={block.min} size={z(11)} color={colors.textSecondary} />
      </HRow>
      <HRow>
        <Measured
          amount={block.rain.amount}
          unit={block.rain.unit}
          amountSize={z(14)}
          unitSize={z(9)}
          colors={colors}
        />
        <Spacer width={z(8)} />
        <Measured
          amount={block.wind.amount}
          unit={block.wind.unit}
          amountSize={z(14)}
          unitSize={z(9)}
          colors={colors}
        />
      </HRow>
      {/* The chance spans the whole cell, under both the rain and the wind. */}
      {block.rainChance ? (
        <IconText
          icon="umbrella-outline"
          text={block.rainChance}
          size={z(12)}
          iconSize={z(12)}
          colors={colors}
        />
      ) : null}
    </Column>
  );
}

export function DailyScreen({
  model,
  colors,
  scale,
}: ScreenProps<DailyScreenModel>) {
  const z = zoom(scale);
  return (
    <Rows>
      <EvenRow>
        {model.columns.map((pair) => (
          <DayCell
            key={pair[0].weekday}
            block={pair[0]}
            colors={colors}
            z={z}
          />
        ))}
      </EvenRow>
      <Divider colors={colors} />
      <EvenRow>
        {model.columns.map((pair) =>
          pair[1] ? (
            <DayCell
              key={pair[1].weekday}
              block={pair[1]}
              colors={colors}
              z={z}
            />
          ) : (
            <Column key={`${pair[0].weekday}-free`} />
          ),
        )}
      </EvenRow>
    </Rows>
  );
}
