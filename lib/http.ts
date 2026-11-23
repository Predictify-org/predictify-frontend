import { z, type ZodType } from "zod";

export type HttpErrorKind = "timeout" | "network" | "status" | "parse" | "aborted";

export class HttpError extends Error {
  readonly kind: HttpErrorKind;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    message: string,
    kind: HttpErrorKind,
    options: { retryable?: boolean; status?: number } = {},
  ) {
    super(message);
    this.name = "HttpError";
    this.kind = kind;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}

export interface HttpOptions<TBody = unknown> {
  schema: ZodType;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  body?: TBody;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
  signal?: AbortSignal;
  headers?: HeadersInit;
  cache?: RequestCache;
  fetchImpl?: typeof fetch;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));

const parseRetryAfter = (response: Response): number | null => {
  const value = response.headers.get("Retry-After");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
};

export async function http<T>(
  url: string,
  options: HttpOptions,
): Promise<T> {
  const method = options.method ?? "GET";
  const fetchImpl = options.fetchImpl ?? fetch;
  const retries = Math.max(
    0,
    options.retries ?? (method === "GET" ? 2 : 0),
  );
  const backoffMs = options.backoffMs ?? 300;
  let callerAborted = false;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (options.signal?.aborted) {
      throw new HttpError("Request was aborted.", "aborted");
    }

    const timeoutController = new AbortController();
    let timedOut = false;
    const onCallerAbort = () => {
      callerAborted = true;
      timeoutController.abort();
    };
    options.signal?.addEventListener("abort", onCallerAbort, { once: true });

    const timeoutId =
      options.timeoutMs && options.timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            timeoutController.abort();
          }, options.timeoutMs)
        : null;

    try {
      const headers = new Headers(options.headers);
      if (options.body !== undefined && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetchImpl(url, {
        method,
        headers,
        body:
          options.body === undefined
            ? undefined
            : typeof options.body === "string"
              ? options.body
              : JSON.stringify(options.body),
        signal: timeoutController.signal,
        cache: options.cache,
      });

      if (!response.ok) {
        const statusError = new HttpError(
          `Request failed with status ${response.status}.`,
          "status",
          { retryable: response.status === 429 || response.status >= 500, status: response.status },
        );
        const retryable =
          method === "GET" &&
          (response.status === 429 || response.status >= 500);
        if (retryable && attempt < retries) {
          const retryAfter = parseRetryAfter(response);
          const exponential = backoffMs * 2 ** attempt;
          const jitter = Math.random() * Math.min(exponential, 1000);
          await sleep(retryAfter ?? Math.min(30000, exponential + jitter));
          continue;
        }
        throw statusError;
      }

      if (response.status === 204) {
        try {
          return options.schema.parse(undefined) as T;
        } catch (error) {
          throw new HttpError(
            error instanceof z.ZodError
              ? `Response validation failed: ${error.message}`
              : "Response parsing failed.",
            "parse",
          );
        }
      }

      const text = await response.text();
      let payload: unknown;
      try {
        payload = text.trim() ? JSON.parse(text) : undefined;
      } catch {
        throw new HttpError("Response was not valid JSON.", "parse");
      }

      try {
        return options.schema.parse(payload) as T;
      } catch (error) {
        throw new HttpError(
          error instanceof z.ZodError
            ? `Response validation failed: ${error.message}`
            : "Response parsing failed.",
          "parse",
        );
      }
    } catch (error) {
      if (callerAborted || options.signal?.aborted) {
        throw new HttpError("Request was aborted.", "aborted");
      }
      if (timedOut) {
        if (attempt < retries && method === "GET") {
          const exponential = backoffMs * 2 ** attempt;
          await sleep(Math.min(30000, exponential));
          continue;
        }
        throw new HttpError("Request timed out.", "timeout", { retryable: true });
      }
      if (error instanceof HttpError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new HttpError("Request was aborted.", "aborted");
      }
      if (attempt < retries && method === "GET") {
        const exponential = backoffMs * 2 ** attempt;
        const jitter = Math.random() * Math.min(exponential, 1000);
        await sleep(Math.min(30000, exponential + jitter));
        continue;
      }
      throw new HttpError(
        error instanceof Error ? error.message : "Network request failed.",
        "network",
        { retryable: true },
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", onCallerAbort);
    }
  }

  throw new HttpError("Network request failed.", "network", { retryable: true });
}
