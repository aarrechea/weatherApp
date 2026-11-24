import { WeatherApiError } from "../errors";

/** Small validators for provider JSON. Anything unexpected is a parse error. */

export type JsonObject = Record<string, unknown>;

export function parseError(message: string): WeatherApiError {
  return new WeatherApiError("parse", message);
}

export function asObject(value: unknown, field: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw parseError(`Expected "${field}" to be an object.`);
  }
  return value as JsonObject;
}

export function asNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw parseError(`Missing or invalid number "${field}".`);
  }
  return value;
}

export function asNullableNumber(value: unknown, field: string): number | null {
  return value === null || value === undefined ? null : asNumber(value, field);
}

export function asString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw parseError(`Missing or invalid string "${field}".`);
  }
  return value;
}

export function asColumn(
  section: JsonObject,
  name: string,
  length?: number,
): unknown[] {
  const column = section[name];
  if (!Array.isArray(column)) {
    throw parseError(`Missing data series "${name}".`);
  }
  if (length !== undefined && column.length !== length) {
    throw parseError(
      `Data series "${name}" has ${column.length} entries, expected ${length}.`,
    );
  }
  return column;
}
