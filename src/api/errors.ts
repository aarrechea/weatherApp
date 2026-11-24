export type WeatherApiErrorKind =
  /** The request never reached the server (offline, DNS, refused). */
  | "network"
  /** The server did not answer in time. */
  | "timeout"
  /** The server answered with an error status. */
  | "http"
  /** The server answered, but the body was not what we expected. */
  | "parse";

export class WeatherApiError extends Error {
  readonly kind: WeatherApiErrorKind;
  readonly status?: number;

  constructor(
    kind: WeatherApiErrorKind,
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "WeatherApiError";
    this.kind = kind;
    this.status = options?.status;
  }
}
