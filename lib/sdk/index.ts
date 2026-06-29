export type StreamStatus = "draft" | "active" | "paused" | "ended";

export interface StreamPayStream {
  id: string;
  recipient: string;
  rate: string;
  status: StreamStatus;
  allowed_actions?: string[];
  created_at?: string;
  updated_at?: string;
  settlement?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface StreamPayActivityEvent {
  id: string;
  type: string;
  timestamp: string;
  description?: string;
  streamId?: string;
  [key: string]: unknown;
}

export interface CreateStreamInput {
  recipient: string;
  rate: string;
  schedule: string;
  token?: string;
}

export interface PageQuery {
  [key: string]: string | number | boolean | null | undefined;
  cursor?: string;
  limit?: number;
}

export interface StreamListQuery extends PageQuery {
  status?: StreamStatus;
}

export interface ActivityListQuery extends PageQuery {
  streamId?: string;
  type?: string;
}

export interface StreamPayPage<T> {
  data: T[];
  links?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface StreamPayItem<T> {
  data: T;
  links?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type EventSourceLike = {
  close(): void;
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  onerror: ((event: Event) => void) | null;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
};

export type EventSourceFactory = (url: string) => EventSourceLike;

export interface StreamPayClientOptions {
  baseUrl: string;
  token?: string;
  fetchFn?: FetchLike;
  eventSourceFactory?: EventSourceFactory;
  requestIdFactory?: () => string;
  streamEventsPath?: string;
}

export interface RequestOptions {
  headers?: HeadersInit;
  idempotencyKey?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
}

export interface StreamEventHandlers {
  onUpdate?: (stream: StreamPayStream) => void;
  onSettlement?: (stream: StreamPayStream) => void;
  onMessage?: (event: MessageEvent<string>) => void;
  onOpen?: (event: Event) => void;
  onError?: (event: Event) => void;
}

export interface StreamSubscription {
  url: string;
  close(): void;
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    details?: unknown;
    message?: string;
    request_id?: string;
  };
}

export class StreamPaySdkError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;
  readonly status: number;

  constructor(message: string, options: { code: string; details?: unknown; requestId?: string; status: number }) {
    super(message);
    this.name = "StreamPaySdkError";
    this.code = options.code;
    this.details = options.details;
    this.requestId = options.requestId;
    this.status = options.status;
  }
}

function defaultRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `req-${crypto.randomUUID()}`;
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions["query"]): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(trimSlashes(path), base);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return response.text();
  }
  return response.json();
}

function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return Boolean(value && typeof value === "object" && "error" in value);
}

export class StreamPayClient {
  private readonly baseUrl: string;
  private readonly eventSourceFactory?: EventSourceFactory;
  private readonly fetchFn: FetchLike;
  private readonly requestIdFactory: () => string;
  private readonly streamEventsPath: string;
  private readonly token?: string;

  constructor(options: StreamPayClientOptions) {
    if (!options.baseUrl.trim()) {
      throw new Error("StreamPayClient requires a non-empty baseUrl");
    }

    this.baseUrl = options.baseUrl;
    this.eventSourceFactory = options.eventSourceFactory;
    this.fetchFn = options.fetchFn ?? fetch.bind(globalThis);
    this.requestIdFactory = options.requestIdFactory ?? defaultRequestId;
    this.streamEventsPath = options.streamEventsPath ?? "/api/streams/events";
    this.token = options.token;
  }

  async listStreams(query: StreamListQuery = {}): Promise<StreamPayPage<StreamPayStream>> {
    return this.request("GET", "/api/v2/streams", { query });
  }

  async getStream(id: string): Promise<StreamPayItem<StreamPayStream>> {
    this.assertId(id, "stream id");
    return this.request("GET", `/api/v2/streams/${encodeURIComponent(id)}`);
  }

  async createStream(input: CreateStreamInput, options: RequestOptions = {}): Promise<StreamPayItem<StreamPayStream>> {
    if (!input.recipient.trim() || !input.rate.trim() || !input.schedule.trim()) {
      throw new Error("recipient, rate, and schedule are required");
    }
    return this.request("POST", "/api/v2/streams", options, input);
  }

  async deleteStream(id: string): Promise<void> {
    this.assertId(id, "stream id");
    await this.request("DELETE", `/api/v2/streams/${encodeURIComponent(id)}`);
  }

  async listActivity(query: ActivityListQuery = {}): Promise<StreamPayPage<StreamPayActivityEvent>> {
    return this.request("GET", "/api/activity", { query });
  }

  subscribeToStream(streamId: string, handlers: StreamEventHandlers = {}): StreamSubscription {
    this.assertId(streamId, "stream id");
    const factory =
      this.eventSourceFactory ??
      ((url: string) => {
        if (typeof EventSource === "undefined") {
          throw new Error("EventSource is not available; pass eventSourceFactory in this environment");
        }
        return new EventSource(url);
      });

    const query: Record<string, string> = { streamId };
    if (this.token) {
      query.token = this.token;
    }

    const url = buildUrl(this.baseUrl, this.streamEventsPath, query);
    const source = factory(url);
    source.onopen = handlers.onOpen ?? null;
    source.onerror = handlers.onError ?? null;
    source.onmessage = handlers.onMessage ?? null;
    source.addEventListener("stream:updated", (event) => handlers.onUpdate?.(this.parseStreamEvent(event)));
    source.addEventListener("settle:finished", (event) => handlers.onSettlement?.(this.parseStreamEvent(event)));

    return {
      url,
      close: () => source.close(),
    };
  }

  private async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
    body?: unknown,
  ): Promise<T> {
    const requestId = this.requestIdFactory();
    const headers = new Headers(options.headers);
    headers.set("accept", "application/json");
    headers.set("x-request-id", requestId);

    if (this.token) {
      headers.set("authorization", `Bearer ${this.token}`);
    }

    if (options.idempotencyKey) {
      headers.set("Idempotency-Key", options.idempotencyKey);
    }

    let payload: string | undefined;
    if (body !== undefined) {
      headers.set("content-type", "application/json");
      payload = JSON.stringify(body);
    }

    const response = await this.fetchFn(buildUrl(this.baseUrl, path, options.query), {
      body: payload,
      headers,
      method,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const parsed = await parseJson(response);
    if (!response.ok) {
      throw this.toSdkError(response, parsed, requestId);
    }

    return parsed as T;
  }

  private parseStreamEvent(event: MessageEvent<string>): StreamPayStream {
    try {
      return JSON.parse(event.data) as StreamPayStream;
    } catch {
      throw new StreamPaySdkError("SSE event payload was not valid JSON", {
        code: "INVALID_SSE_PAYLOAD",
        status: 0,
      });
    }
  }

  private toSdkError(response: Response, body: unknown, fallbackRequestId: string): StreamPaySdkError {
    if (isErrorEnvelope(body) && body.error) {
      return new StreamPaySdkError(body.error.message ?? response.statusText, {
        code: body.error.code ?? "UNKNOWN_ERROR",
        details: body.error.details,
        requestId: body.error.request_id ?? response.headers.get("x-request-id") ?? fallbackRequestId,
        status: response.status,
      });
    }

    return new StreamPaySdkError(response.statusText || "StreamPay request failed", {
      code: "HTTP_ERROR",
      details: body,
      requestId: response.headers.get("x-request-id") ?? fallbackRequestId,
      status: response.status,
    });
  }

  private assertId(value: string, label: string) {
    if (!value || !value.trim()) {
      throw new Error(`${label} is required`);
    }
  }
}

export function createStreamPayClient(options: StreamPayClientOptions): StreamPayClient {
  return new StreamPayClient(options);
}
