import type { GeoLocation } from "@/domain";

import { buildUrl, fetchJson } from "../http";
import type { GeocodingProvider, SearchOptions } from "../types";
import { asNumber, asObject, asString, parseError } from "./parse";

export const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

const MIN_QUERY_LENGTH = 2;

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Convert a raw geocoding response into a list of `GeoLocation`. */
export function mapGeocodingResponse(body: unknown): GeoLocation[] {
  const root = asObject(body, "response");
  // Open-Meteo leaves `results` out entirely when nothing matches.
  if (root.results === undefined) return [];
  if (!Array.isArray(root.results)) {
    throw parseError('Expected "results" to be a list.');
  }

  return root.results.map((item): GeoLocation => {
    const place = asObject(item, "results[]");
    return {
      id: asNumber(place.id, "results[].id"),
      name: asString(place.name, "results[].name"),
      latitude: asNumber(place.latitude, "results[].latitude"),
      longitude: asNumber(place.longitude, "results[].longitude"),
      country: optionalString(place.country),
      countryCode: optionalString(place.country_code),
      region: optionalString(place.admin1),
      timezone: optionalString(place.timezone),
    };
  });
}

export const openMeteoGeocoding: GeocodingProvider = {
  async searchCities(query, options: SearchOptions = {}) {
    const name = query.trim();
    if (name.length < MIN_QUERY_LENGTH) return [];

    const body = await fetchJson(
      buildUrl(GEOCODING_URL, {
        name,
        count: options.count ?? 10,
        language: options.language ?? "en",
        format: "json",
      }),
      options.timeoutMs,
    );
    return mapGeocodingResponse(body);
  },
};
