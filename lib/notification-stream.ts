import type {
  NotificationCategory,
  NotificationItem,
} from "@/types/notifications";

export type NotificationStreamStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "stopped";

interface MessageEventLike {
  data: string;
  lastEventId?: string;
}

export interface EventSourceLike {
  onopen: (() => void) | null;
  onmessage: ((event: MessageEventLike) => void) | null;
  onerror: (() => void) | null;
  close: () => void;
}

interface Scheduler {
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => void;
}

interface StreamLogger {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

export interface NotificationStreamOptions {
  url: string;
  expectedUserId: string;
  onNotification: (notification: NotificationItem) => void;
  onStatusChange?: (status: NotificationStreamStatus) => void;
  baseRetryMs?: number;
  maxRetryMs?: number;
  connectTimeoutMs?: number;
  maxRememberedEventIds?: number;
  eventSourceFactory?: (url: string) => EventSourceLike;
  scheduler?: Scheduler;
  logger?: StreamLogger;
}

const CATEGORIES = new Set<NotificationCategory>([
  "market",
  "dispute",
  "payout",
  "system",
  "account",
]);

const defaultScheduler: Scheduler = {
  setTimeout: (callback, delay) => setTimeout(callback, delay),
  clearTimeout: (timer) => clearTimeout(timer),
};

const defaultLogger: StreamLogger = console;

function positiveNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function parseNotification(data: string): NotificationItem | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const timestamp = new Date(item.timestamp as string | number | Date);
  const hrefIsSafe =
    item.href === undefined ||
    (typeof item.href === "string" &&
      item.href.startsWith("/") &&
      !item.href.startsWith("//") &&
      !item.href.includes("\\"));

  if (
    typeof item.id !== "string" ||
    item.id.trim() === "" ||
    typeof item.userId !== "string" ||
    typeof item.title !== "string" ||
    item.title.trim() === "" ||
    typeof item.category !== "string" ||
    !CATEGORIES.has(item.category as NotificationCategory) ||
    typeof item.read !== "boolean" ||
    Number.isNaN(timestamp.getTime()) ||
    (item.description !== undefined && typeof item.description !== "string") ||
    !hrefIsSafe
  ) {
    return null;
  }

  return {
    id: item.id,
    userId: item.userId,
    category: item.category as NotificationCategory,
    title: item.title,
    description: item.description as string | undefined,
    timestamp,
    read: item.read,
    href: item.href as string | undefined,
  };
}

function validatedStreamUrl(rawUrl: string): URL {
  if (typeof window === "undefined") {
    throw new Error("Notification streams can only start in a browser");
  }

  const url = new URL(rawUrl, window.location.origin);
  if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) {
    throw new Error("Notification stream URL must be same-origin HTTP(S)");
  }
  return url;
}

/**
 * Owns exactly one EventSource and at most one pending reconnect. A generation
 * token makes callbacks from closed sources harmless, while the bounded event
 * ID set makes server replays idempotent without unbounded memory growth.
 */
export class NotificationStream {
  private readonly baseRetryMs: number;
  private readonly maxRetryMs: number;
  private readonly connectTimeoutMs: number;
  private readonly maxRememberedEventIds: number;
  private readonly factory: (url: string) => EventSourceLike;
  private readonly scheduler: Scheduler;
  private readonly logger: StreamLogger;
  private readonly url: URL;
  private source: EventSourceLike | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private generation = 0;
  private running = false;
  private lastEventId = "";
  private readonly seenEventIds = new Set<string>();

  constructor(private readonly options: NotificationStreamOptions) {
    this.url = validatedStreamUrl(options.url);
    this.baseRetryMs = positiveNumber(options.baseRetryMs, 1_000);
    this.maxRetryMs = Math.max(
      this.baseRetryMs,
      positiveNumber(options.maxRetryMs, 30_000)
    );
    this.connectTimeoutMs = positiveNumber(options.connectTimeoutMs, 10_000);
    this.maxRememberedEventIds = Math.max(
      1,
      Math.floor(positiveNumber(options.maxRememberedEventIds, 1_000))
    );
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.logger = options.logger ?? defaultLogger;
    this.factory =
      options.eventSourceFactory ??
      ((url) =>
        new EventSource(url, { withCredentials: true }) as unknown as EventSourceLike);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.generation += 1;
    this.connect(this.generation, false);
  }

  stop(): void {
    if (!this.running && !this.source && !this.reconnectTimer) return;
    this.running = false;
    this.generation += 1;
    this.clearConnectTimer();
    if (this.reconnectTimer) {
      this.scheduler.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.closeSource();
    this.setStatus("stopped");
  }

  private connect(generation: number, reconnecting: boolean): void {
    if (!this.running || generation !== this.generation) return;
    this.setStatus(reconnecting ? "reconnecting" : "connecting");

    const url = new URL(this.url.toString());
    if (this.lastEventId) url.searchParams.set("lastEventId", this.lastEventId);

    let source: EventSourceLike;
    try {
      source = this.factory(url.toString());
    } catch {
      this.logger.error("Notification stream connection could not be created");
      this.scheduleReconnect(generation);
      return;
    }

    this.source = source;
    this.connectTimer = this.scheduler.setTimeout(() => {
      if (!this.isCurrent(source, generation)) return;
      this.logger.warn("Notification stream connection timed out", {
        attempt: this.retryAttempt + 1,
      });
      this.scheduleReconnect(generation);
    }, this.connectTimeoutMs);

    source.onopen = () => {
      if (!this.isCurrent(source, generation)) return;
      this.clearConnectTimer();
      this.retryAttempt = 0;
      this.setStatus("connected");
    };

    source.onmessage = (event) => {
      if (!this.isCurrent(source, generation)) return;
      const notification = parseNotification(event.data);
      if (!notification) {
        this.logger.warn("Notification stream payload rejected", {
          reason: "invalid-payload",
        });
        return;
      }
      if (notification.userId !== this.options.expectedUserId) {
        this.logger.warn("Notification stream payload rejected", {
          reason: "user-mismatch",
        });
        return;
      }

      const eventId = event.lastEventId?.trim() || notification.id;
      if (this.seenEventIds.has(eventId)) return;

      try {
        this.options.onNotification(notification);
      } catch {
        this.logger.error("Notification stream handler failed");
        return;
      }

      this.rememberEventId(eventId);
      if (event.lastEventId?.trim()) this.lastEventId = event.lastEventId.trim();
    };

    source.onerror = () => {
      if (!this.isCurrent(source, generation)) return;
      this.logger.warn("Notification stream disconnected", {
        attempt: this.retryAttempt + 1,
      });
      this.scheduleReconnect(generation);
    };
  }

  private scheduleReconnect(generation: number): void {
    if (!this.running || generation !== this.generation || this.reconnectTimer) return;
    this.clearConnectTimer();
    this.closeSource();
    const delay = Math.min(
      this.maxRetryMs,
      this.baseRetryMs * 2 ** Math.min(this.retryAttempt, 30)
    );
    this.retryAttempt += 1;
    this.setStatus("reconnecting");
    this.logger.info("Notification stream reconnect scheduled", {
      attempt: this.retryAttempt,
      delayMs: delay,
    });
    this.reconnectTimer = this.scheduler.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(generation, true);
    }, delay);
  }

  private rememberEventId(eventId: string): void {
    this.seenEventIds.add(eventId);
    if (this.seenEventIds.size <= this.maxRememberedEventIds) return;
    const oldest = this.seenEventIds.values().next().value as string | undefined;
    if (oldest) this.seenEventIds.delete(oldest);
  }

  private isCurrent(source: EventSourceLike, generation: number): boolean {
    return this.running && generation === this.generation && source === this.source;
  }

  private clearConnectTimer(): void {
    if (!this.connectTimer) return;
    this.scheduler.clearTimeout(this.connectTimer);
    this.connectTimer = null;
  }

  private closeSource(): void {
    if (!this.source) return;
    this.source.onopen = null;
    this.source.onmessage = null;
    this.source.onerror = null;
    this.source.close();
    this.source = null;
  }

  private setStatus(status: NotificationStreamStatus): void {
    this.options.onStatusChange?.(status);
  }
}
