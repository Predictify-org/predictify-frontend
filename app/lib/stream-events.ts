/**
 * @module stream-events
 *
 * In-memory stream event store and command processor for StreamPay.
 *
 * This module is the authoritative runtime for stream lifecycle mutations.
 * It owns the per-stream lock, idempotency cache, metrics counters, and
 * the settlement-tick accounting leg.
 *
 * ## Architecture
 * - {@link InMemoryStreamStore} is the single mutable store; one instance
 *   per process (or per test suite via constructor injection).
 * - All mutations go through {@link InMemoryStreamStore.applyEvent}, which
 *   acquires a per-stream lock before touching any state.
 * - Idempotency is enforced per `(streamId, actorTenantId, idempotencyKey)`
 *   triple; replaying the same key returns the cached result.
 *
 * ## Error codes
 * | Code | HTTP | Meaning |
 * |---|---|---|
 * | `NOT_FOUND` | 404 | Stream does not exist |
 * | `FORBIDDEN` | 403 | Actor tenant ≠ stream tenant |
 * | `INVALID_COMMAND` | 400 | Unknown command type or bad parameters |
 * | `ILLEGAL_TRANSITION` | 409 | Action not allowed in current status |
 * | `INSUFFICIENT_AVAILABLE` | 409 | Available balance too low |
 * | `INSUFFICIENT_ESCROW` | 409 | Escrow balance too low for settle tick |
 */

import { StreamStatus, StreamAction } from "@/app/types/openapi";
import { transition } from "./state-machine";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Mutable on-chain stream record.
 *
 * All balance fields are `bigint` (i128 raw units — no per-decimal logic here).
 * Callers apply the correct decimal exponent when displaying to end-users.
 */
export type StreamRecord = {
  /** Funds available for the recipient to withdraw (raw units). */
  availableBalance: bigint;
  /** Funds locked in escrow pending settlement (raw units). */
  escrowBalance: bigint;
  /** Unique stream identifier. */
  id: string;
  /** Unix timestamp (ms) of the last settlement tick. */
  lastSettlementAt: number;
  /** Current lifecycle status. */
  status: StreamStatus;
  /** Owning tenant identifier — used for cross-tenant access control. */
  tenantId: string;
};

/**
 * Union of all valid stream command types.
 * Standard {@link StreamAction} values plus the internal `settle_tick`.
 */
export type StreamCommandType = StreamAction | "settle_tick" | (string & {});

const VALID_COMMAND_TYPES = new Set<string>([
  "start", "pause", "stop", "settle", "withdraw", "settle_tick",
]);

/**
 * A command to apply to a stream.
 *
 * @property type             - The command to execute.
 * @property actorTenantId    - Tenant ID of the caller; must match stream.tenantId.
 * @property idempotencyKey   - Optional deduplication key; same key returns cached result.
 * @property at               - Timestamp override for `settle_tick` (defaults to Date.now()).
 * @property settleAmount     - Amount to move from escrow → available on `settle_tick`.
 * @property processingDelayMs - Artificial delay for testing concurrency (ms).
 */
export type StreamCommand = {
  actorTenantId: string;
  at?: number;
  idempotencyKey?: string;
  processingDelayMs?: number;
  settleAmount?: bigint;
  type: StreamCommandType;
};

/**
 * Stable error codes returned by stream operations.
 *
 * - `NOT_FOUND`              — stream does not exist.
 * - `FORBIDDEN`              — actor tenant ≠ stream tenant.
 * - `INVALID_COMMAND`        — unknown command type or invalid parameters.
 * - `ILLEGAL_TRANSITION`     — action not permitted in current status.
 * - `INSUFFICIENT_AVAILABLE` — available balance too low for the operation.
 * - `INSUFFICIENT_ESCROW`    — escrow balance too low for a settle tick.
 */
export type StreamErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INVALID_COMMAND"
  | "ILLEGAL_TRANSITION"
  | "INSUFFICIENT_AVAILABLE"
  | "INSUFFICIENT_ESCROW";

/** Structured error returned by stream operations. */
export type StreamError = {
  code: StreamErrorCode;
  httpStatus: 400 | 403 | 404 | 409;
  message: string;
};

/**
 * Result of a stream command.
 * Discriminated union — check `ok` before accessing `stream` or `error`.
 */
export type StreamResult =
  | { ok: true; stream: StreamRecord }
  | { error: StreamError; ok: false };

/**
 * Aggregate metrics for pause/resume operations.
 * Monotonically increasing counters — never reset during process lifetime.
 */
export type StreamMetrics = {
  pauseAttempts: number;
  pauseFailures: number;
  pauseSuccess: number;
  resumeAttempts: number;
  resumeFailures: number;
  resumeSuccess: number;
};

/** @internal Persisted idempotency record. */
type PersistedResult = {
  commandType: StreamCommandType;
  result: StreamResult;
};

/** @internal Per-stream lock state. */
type LockState = {
  queue: Promise<void>;
  release: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deep-clone a stream record (bigint fields included). */
function cloneStream(stream: StreamRecord): StreamRecord {
  return {
    ...stream,
    availableBalance: BigInt(stream.availableBalance),
    escrowBalance: BigInt(stream.escrowBalance),
  };
}

/** Construct a typed StreamResult error. */
function streamError(
  httpStatus: StreamError["httpStatus"],
  code: StreamErrorCode,
  message: string,
): StreamResult {
  return { error: { code, httpStatus, message }, ok: false };
}

/** Create a promise/release pair for the per-stream lock. */
function createReleasePromise(): LockState {
  let release = () => { return; };
  const queue = new Promise<void>((resolve) => { release = resolve; });
  return { queue, release };
}

/** Async sleep helper. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

// ── InMemoryStreamStore ───────────────────────────────────────────────────────

/**
 * In-memory stream store with per-stream locking and idempotency.
 *
 * ## Concurrency model
 * Each stream has its own lock. Commands for the same stream are serialised;
 * commands for different streams run concurrently.
 *
 * ## Idempotency
 * When a command carries an `idempotencyKey`, the result is cached under
 * `(streamId, actorTenantId, idempotencyKey)`. Replaying the same triple
 * returns the cached result without re-executing the command.
 *
 * ## Usage
 * ```ts
 * const store = new InMemoryStreamStore([...initialStreams]);
 * const result = await store.applyEvent("stream-1", {
 *   type: "pause",
 *   actorTenantId: "tenant-abc",
 *   idempotencyKey: "idem-xyz",
 * });
 * ```
 */
export class InMemoryStreamStore {
  private readonly idempotentResults = new Map<string, PersistedResult>();
  private readonly locks = new Map<string, LockState>();
  private readonly streams = new Map<string, StreamRecord>();

  /** Live metrics counters. Read-only from outside the class. */
  readonly metrics: StreamMetrics = {
    pauseAttempts: 0,
    pauseFailures: 0,
    pauseSuccess: 0,
    resumeAttempts: 0,
    resumeFailures: 0,
    resumeSuccess: 0,
  };

  /**
   * @param initialStreams - Seed streams loaded into the store at construction.
   */
  constructor(initialStreams: StreamRecord[]) {
    for (const stream of initialStreams) {
      this.streams.set(stream.id, cloneStream(stream));
    }
  }

  /**
   * Return a snapshot of the stream record, or `undefined` if not found.
   *
   * @param streamId - Stream identifier.
   * @returns Cloned stream record, or `undefined`.
   */
  getStream(streamId: string): StreamRecord | undefined {
    const existing = this.streams.get(streamId);
    if (!existing) return undefined;
    return cloneStream(existing);
  }

  /**
   * Acquire the per-stream lock and execute `fn` exclusively.
   *
   * Lock ordering policy: always acquire the stream lock first. Subordinate
   * rows (escrow/events) are in-memory fields and may only be touched while
   * this lock is held.
   *
   * @internal
   */
  private async withStreamLock<T>(streamId: string, fn: () => Promise<T>): Promise<T> {
    const current = this.locks.get(streamId);
    const next = createReleasePromise();
    this.locks.set(streamId, next);
    if (current) await current.queue;
    try {
      return await fn();
    } finally {
      next.release();
      if (this.locks.get(streamId) === next) this.locks.delete(streamId);
    }
  }

  /** @internal Build the idempotency cache key. */
  private buildIdempotencyToken(streamId: string, command: StreamCommand): string {
    return `${streamId}:${command.actorTenantId}:${command.idempotencyKey}`;
  }

  /**
   * Return the cached result for a command if one exists, or `undefined`.
   *
   * If the cached command type differs from the current command type, returns
   * a 409 ILLEGAL_TRANSITION error (idempotency key reuse across command types
   * is not allowed).
   *
   * @internal
   */
  private maybeGetIdempotentResult(
    streamId: string,
    command: StreamCommand,
  ): StreamResult | undefined {
    if (!command.idempotencyKey) return undefined;
    const persisted = this.idempotentResults.get(
      this.buildIdempotencyToken(streamId, command),
    );
    if (!persisted) return undefined;
    if (persisted.commandType !== command.type) {
      return streamError(
        409,
        "ILLEGAL_TRANSITION",
        "Idempotency key already used for a different command.",
      );
    }
    return persisted.result;
  }

  /** @internal Persist the result for future idempotency lookups. */
  private persistIdempotentResult(
    streamId: string,
    command: StreamCommand,
    result: StreamResult,
  ): void {
    if (!command.idempotencyKey) return;
    this.idempotentResults.set(this.buildIdempotencyToken(streamId, command), {
      commandType: command.type,
      result,
    });
  }

  /**
   * Verify the actor belongs to the stream's tenant.
   *
   * @returns A FORBIDDEN StreamResult if the actor is from a different tenant,
   *          or `undefined` if the check passes.
   * @internal
   */
  private validateActor(
    stream: StreamRecord,
    command: StreamCommand,
  ): StreamResult | undefined {
    if (stream.tenantId !== command.actorTenantId) {
      return streamError(403, "FORBIDDEN", "Actor cannot mutate another tenant's stream.");
    }
    return undefined;
  }

  /**
   * Apply a settlement tick: move `settleAmount` from escrow → available.
   *
   * **Preconditions:**
   * - Stream must not be `ended` or `withdrawn`.
   * - `settleAmount >= 0`.
   * - `stream.escrowBalance >= settleAmount`.
   *
   * **Postconditions:**
   * - `escrowBalance` decremented by `settleAmount`.
   * - `availableBalance` incremented by `settleAmount`.
   * - `lastSettlementAt` set to `at`.
   *
   * **Errors:**
   * - `ILLEGAL_TRANSITION` — stream is ended/withdrawn.
   * - `INVALID_COMMAND` — `settleAmount < 0`.
   * - `INSUFFICIENT_ESCROW` — escrow balance too low.
   *
   * @internal
   */
  private applySettleTick(
    stream: StreamRecord,
    settleAmount: bigint,
    at: number,
  ): StreamResult {
    if (stream.status === "ended" || stream.status === "withdrawn") {
      return streamError(409, "ILLEGAL_TRANSITION", "Cannot settle an ended or withdrawn stream.");
    }
    if (settleAmount < 0n) {
      return streamError(400, "INVALID_COMMAND", "settleAmount must be >= 0.");
    }
    if (stream.escrowBalance < settleAmount) {
      return streamError(409, "INSUFFICIENT_ESCROW", "Insufficient escrow for settlement tick.");
    }
    stream.escrowBalance   -= settleAmount;
    stream.availableBalance += settleAmount;
    stream.lastSettlementAt = at;
    return { ok: true, stream: cloneStream(stream) };
  }

  /** @internal Increment attempt counters before executing a command. */
  private trackMetricAttempt(type: StreamCommandType): void {
    if (type === "pause")  this.metrics.pauseAttempts  += 1;
    if (type === "start")  this.metrics.resumeAttempts += 1;
  }

  /** @internal Increment success/failure counters after executing a command. */
  private trackMetricResult(type: StreamCommandType, result: StreamResult): void {
    if (type === "pause") {
      result.ok ? (this.metrics.pauseSuccess += 1) : (this.metrics.pauseFailures += 1);
    }
    if (type === "start") {
      result.ok ? (this.metrics.resumeSuccess += 1) : (this.metrics.resumeFailures += 1);
    }
  }

  /**
   * Apply a command to a stream.
   *
   * **Authorization:** `command.actorTenantId` must match `stream.tenantId`.
   *
   * **Idempotency:** If `command.idempotencyKey` is set and a result for the
   * same `(streamId, actorTenantId, idempotencyKey)` triple already exists,
   * the cached result is returned without re-executing the command.
   *
   * **Concurrency:** The per-stream lock is held for the duration of the call.
   * Concurrent calls for the same stream are serialised; calls for different
   * streams run in parallel.
   *
   * **State transitions** are delegated to {@link transition} in `state-machine.ts`.
   * Settlement ticks are handled internally via {@link applySettleTick}.
   *
   * @param streamId - Target stream identifier.
   * @param command  - Command to apply.
   * @returns        {@link StreamResult} — ok with updated stream, or error.
   *
   * @example
   * ```ts
   * const result = await store.applyEvent("stream-1", {
   *   type: "pause",
   *   actorTenantId: "tenant-abc",
   *   idempotencyKey: "idem-xyz",
   * });
   * if (result.ok) console.log(result.stream.status); // "paused"
   * ```
   */
  async applyEvent(streamId: string, command: StreamCommand): Promise<StreamResult> {
    this.trackMetricAttempt(command.type);

    return this.withStreamLock(streamId, async () => {
      const idempotent = this.maybeGetIdempotentResult(streamId, command);
      if (idempotent) {
        this.trackMetricResult(command.type, idempotent);
        return idempotent;
      }

      const stream = this.streams.get(streamId);
      if (!stream) {
        const notFound = streamError(404, "NOT_FOUND", `Stream ${streamId} was not found.`);
        this.trackMetricResult(command.type, notFound);
        this.persistIdempotentResult(streamId, command, notFound);
        return notFound;
      }

      const authError = this.validateActor(stream, command);
      if (authError) {
        this.trackMetricResult(command.type, authError);
        this.persistIdempotentResult(streamId, command, authError);
        return authError;
      }

      if (command.processingDelayMs && command.processingDelayMs > 0) {
        await sleep(command.processingDelayMs);
      }

      let result: StreamResult;

      if (!VALID_COMMAND_TYPES.has(command.type)) {
        result = streamError(400, "INVALID_COMMAND", `Unsupported command type: ${command.type}.`);
      } else if (command.type === "settle_tick") {
        result = this.applySettleTick(
          stream,
          command.settleAmount ?? 0n,
          command.at ?? Date.now(),
        );
      } else {
        const actionResult = transition(stream.status, command.type as StreamAction);
        if (actionResult.ok) {
          stream.status = actionResult.nextStatus;
          result = { ok: true, stream: cloneStream(stream) };
        } else {
          result = streamError(409, actionResult.code, actionResult.error);
        }
      }

      this.trackMetricResult(command.type, result);
      this.persistIdempotentResult(streamId, command, result);
      return result;
    });
  }
}

// ── Route helpers ─────────────────────────────────────────────────────────────

/**
 * Request shape for pause/resume route helpers.
 */
export type PauseResumeRouteRequest = {
  /** Tenant ID of the actor making the request. */
  actorTenantId: string;
  /** HTTP request headers (used to extract Idempotency-Key). */
  headers: Record<string, string | undefined>;
  /** Target stream identifier. */
  streamId: string;
};

/**
 * Route helper: pause an active stream.
 *
 * **Authorization:** `actorTenantId` must match the stream's tenant.
 *
 * **Preconditions:**
 * - `Idempotency-Key` header must be present.
 * - Stream must be in `active` status.
 *
 * **Postconditions:**
 * - Stream transitions to `paused`.
 *
 * **Errors:**
 * - `INVALID_COMMAND` (400) — missing Idempotency-Key header.
 * - `NOT_FOUND` (404) — stream does not exist.
 * - `FORBIDDEN` (403) — actor tenant mismatch.
 * - `ILLEGAL_TRANSITION` (409) — stream not in `active` status.
 *
 * @param store   - The stream store instance.
 * @param request - Parsed route request.
 * @returns       {@link StreamResult}
 */
export async function pauseRoute(
  store: InMemoryStreamStore,
  request: PauseResumeRouteRequest,
): Promise<StreamResult> {
  const idempotencyKey = request.headers["idempotency-key"];
  if (!idempotencyKey) {
    return {
      error: { code: "INVALID_COMMAND", httpStatus: 400, message: "Idempotency-Key header is required." },
      ok: false,
    };
  }
  return store.applyEvent(request.streamId, {
    actorTenantId: request.actorTenantId,
    idempotencyKey,
    type: "pause",
  });
}

/**
 * Route helper: resume a paused stream.
 *
 * **Authorization:** `actorTenantId` must match the stream's tenant.
 *
 * **Preconditions:**
 * - `Idempotency-Key` header must be present.
 * - Stream must be in `paused` status.
 *
 * **Postconditions:**
 * - Stream transitions to `active`.
 *
 * **Errors:**
 * - `INVALID_COMMAND` (400) — missing Idempotency-Key header.
 * - `NOT_FOUND` (404) — stream does not exist.
 * - `FORBIDDEN` (403) — actor tenant mismatch.
 * - `ILLEGAL_TRANSITION` (409) — stream not in `paused` status.
 *
 * @param store   - The stream store instance.
 * @param request - Parsed route request.
 * @returns       {@link StreamResult}
 */
export async function resumeRoute(
  store: InMemoryStreamStore,
  request: PauseResumeRouteRequest,
): Promise<StreamResult> {
  const idempotencyKey = request.headers["idempotency-key"];
  if (!idempotencyKey) {
    return {
      error: { code: "INVALID_COMMAND", httpStatus: 400, message: "Idempotency-Key header is required." },
      ok: false,
    };
  }
  return store.applyEvent(request.streamId, {
    actorTenantId: request.actorTenantId,
    idempotencyKey,
    type: "start",
  });
}
