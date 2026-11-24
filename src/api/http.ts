import { WeatherApiError } from "./errors";

export const DEFAULT_TIMEOUT_MS = 10_000;

export type Query = Record<string, string | number | boolean | undefined>;

export function buildUrl(baseUrl: string, query: Query): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    parts.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  }
  return parts.length > 0 ? `${baseUrl}?${parts.join("&")}` : baseUrl;
}

async function readErrorReason(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "reason" in body &&
      typeof body.reason === "string"
    ) {
      return body.reason;
    }
  } catch {
    // The error body was not JSON; fall back to the status text.
  }
  return null;
}

/**
 * GET a URL and parse the JSON body. Failures are always reported as a
 * `WeatherApiError` so callers only need to handle one error type.
 */
export async function fetchJson(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (cause) {
      if (timedOut) {
        throw new WeatherApiError(
          "timeout",
          `The weather service did not respond within ${timeoutMs / 1000}s.`,
          { cause },
        );
      }
      throw new WeatherApiError(
        "network",
        "Could not reach the weather service. Check your connection.",
        { cause },
      );
    }

    if (!response.ok) {
      const reason = await readErrorReason(response);
      throw new WeatherApiError(
        "http",
        reason ?? `The weather service returned HTTP ${response.status}.`,
        { status: response.status },
      );
    }

    try {
      return await response.json();
    } catch (cause) {
      if (timedOut) {
        throw new WeatherApiError(
          "timeout",
          `The weather service did not respond within ${timeoutMs / 1000}s.`,
          { cause },
        );
      }
      throw new WeatherApiError(
        "parse",
        "The weather service returned an unreadable response.",
        { cause },
      );
    }
  } finally {
    clearTimeout(timer);
  }
}
