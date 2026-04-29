export type RetryOptions = {
  maxAttempts?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  timeoutMs?: number;
};

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt: number, initialBackoffMs: number, maxBackoffMs: number): number {
  const baseDelay = initialBackoffMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * Math.min(100, Math.max(0, baseDelay)));
  return Math.min(baseDelay + jitter, maxBackoffMs);
}

function shouldRetry(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return null;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<unknown> {
  const maxAttempts = retryOptions.maxAttempts ?? 4;
  const initialBackoffMs = retryOptions.initialBackoffMs ?? 500;
  const maxBackoffMs = retryOptions.maxBackoffMs ?? 5000;
  const timeoutMs = retryOptions.timeoutMs ?? 10000;

  let attempt = 0;
  let lastError: string = "Unknown error";

  while (++attempt <= maxAttempts) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const signal = options.signal ?? controller.signal;

    try {
      const response = await fetch(url, { ...options, signal });

      if (response.ok) {
        clearTimeout(timeoutId);
        if (response.status === 204) return null;
        return await response.json();
      }

      const errorBody = await parseResponseBody(response);
      lastError =
        typeof errorBody === "object" && errorBody !== null && "error" in errorBody
          ? (errorBody as any).error?.message ?? response.statusText
          : response.statusText;

      if (shouldRetry(response.status) && attempt < maxAttempts) {
        const delay = getBackoffDelay(attempt, initialBackoffMs, maxBackoffMs);
        console.warn(`Retrying request (${attempt}/${maxAttempts}) ${url} after ${delay}ms due to status ${response.status}`);
        await sleep(delay);
        continue;
      }

      throw new Error(
        response.status === 503 || response.status === 504
          ? "The Stellar network is temporarily congested. Please wait a moment and try again."
          : `Network request failed: ${response.status} ${lastError}`
      );
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        lastError = `Request timed out after ${timeoutMs}ms`;
      } else if (error instanceof Error) {
        lastError = error.message;
      } else {
        lastError = String(error);
      }

      if (attempt < maxAttempts && (lastError.includes("timed out") || lastError.includes("Failed to fetch") || lastError.includes("Network request failed"))) {
        const delay = getBackoffDelay(attempt, initialBackoffMs, maxBackoffMs);
        console.warn(`Retrying request (${attempt}/${maxAttempts}) ${url} after ${delay}ms due to error: ${lastError}`);
        await sleep(delay);
        continue;
      }

      throw new Error(`Network request failed after ${attempt} attempt${attempt === 1 ? "" : "s"}: ${lastError}`);
    }
  }

  throw new Error(`Network request failed after ${maxAttempts} attempts`);
}

export async function fetchWithIdempotency(url: string, options: RequestInit = {}) {
  const method = options.method?.toUpperCase() || "GET";
  const isMutatingRequest = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const headers = new Headers(options.headers || {});

  if (isMutatingRequest && !headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", crypto.randomUUID());
  }

  return fetchWithRetry(url, { ...options, headers }, { timeoutMs: 10000, maxAttempts: 4 });
}
