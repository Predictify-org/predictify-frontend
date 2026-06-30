/**
 * admin-guard.ts
 *
 * Admin role and global pause-guardian circuit breaker for StreamPay.
 *
 * Mirrors the Soroban contract pattern described in issue #259:
 *
 *   - Admin address stored under instance() storage (here: in-memory singleton).
 *   - set_paused(paused: bool)  — gated by admin.require_auth()
 *   - is_paused()               — public view
 *   - set_admin(new_admin)      — gated by current admin auth; cannot zero the admin
 *
 * ## Upgrade Timelock (Two-step)
 *
 * Implements a two-step upgrade process with 48h timelock:
 *   1. schedule_upgrade(upgrade_data) — admin only, starts the timer
 *   2. execute_upgrade()              — admin only, after timelock expires
 *   3. cancel_upgrade()               — admin only, cancels a pending upgrade
 *
 * ## Contract errors (mapped to HTTP)
 *   - Unauthorized    → 403  (non-admin attempted a privileged op)
 *   - ContractPaused  → 503  (global pause is active)
 *   - TimelockActive  → 400  (upgrade is scheduled but not ready)
 *   - NoUpgradeScheduled → 400 (no upgrade to cancel or execute)
 *   - TimelockNotExpired → 400 (trying to execute too early)
 */

import { NextResponse } from "next/server";
import { tryAuthenticateRequest } from "./auth";
import crypto from "crypto";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMELOCK_HOURS = 48;
const TIMELOCK_MS = TIMELOCK_HOURS * 60 * 60 * 1000;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Supported circuit breaker targets. */
export type CircuitBreakerTarget = "indexer" | "webhook";

/** State of a single named circuit breaker. */
export interface CircuitBreakerState {
  /** Whether this circuit breaker is open (tripped). */
  open: boolean;
  /** ISO-8601 timestamp of the last toggle. */
  updatedAt: string | null;
  /** Admin address that last toggled this breaker. */
  updatedBy: string | null;
}

export interface AdminState {
  /** Stellar G... address of the current admin. Never null after init. */
  adminAddress: string;
  /** Whether the global pause circuit breaker is active. */
  paused: boolean;
  /** ISO-8601 timestamp of the last pause toggle. */
  pausedAt: string | null;
  /** ISO-8601 timestamp of the last admin rotation. */
  adminRotatedAt: string | null;
  /** Pending upgrade (if any). */
  pendingUpgrade: PendingUpgrade | null;
  /** Per-component circuit breakers (indexer, webhook). */
  circuitBreakers: Record<CircuitBreakerTarget, CircuitBreakerState>;
}

export interface PendingUpgrade {
  /** Unique identifier for this upgrade. */
  id: string;
  /** Opaque upgrade data (e.g., new code hash, config). */
  data: string;
  /** ISO-8601 timestamp when the upgrade was scheduled. */
  scheduledAt: string;
  /** ISO-8601 timestamp when the upgrade becomes executable. */
  executableAt: string;
  /** ISO-8601 timestamp when the upgrade was executed (if any). */
  executedAt: string | null;
  /** ISO-8601 timestamp when the upgrade was cancelled (if any). */
  cancelledAt: string | null;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const DEV_ADMIN_PLACEHOLDER = "GADMIN_DEV_PLACEHOLDER_DO_NOT_USE_IN_PROD";

function resolveAdminAddress(): string {
  const addr = process.env.STREAMPAY_ADMIN_ADDRESS?.trim();
  const env  = process.env.NODE_ENV ?? "development";
  const isDev = env === "development" || env === "test";

  if (!addr) {
    if (isDev) {
      console.warn(
        "[admin-guard] STREAMPAY_ADMIN_ADDRESS is not set. " +
        "Using dev placeholder — set this in production.",
      );
      return DEV_ADMIN_PLACEHOLDER;
    }
    throw new Error(
      "[admin-guard] STREAMPAY_ADMIN_ADDRESS is required in non-development environments.",
    );
  }
  return addr;
}

// ── In-memory admin state (instance() storage equivalent) ────────────────────

const _state: AdminState = {
  adminAddress:   resolveAdminAddress(),
  paused:         false,
  pausedAt:       null,
  adminRotatedAt: null,
  pendingUpgrade: null,
  circuitBreakers: {
    indexer: { open: false, updatedAt: null, updatedBy: null },
    webhook: { open: false, updatedAt: null, updatedBy: null },
  },
};

// ── Public view ───────────────────────────────────────────────────────────────

/** Returns true when the global pause circuit breaker is active. */
export function isPaused(): boolean {
  return _state.paused;
}

/** Returns the current admin address. */
export function getAdminAddress(): string {
  return _state.adminAddress;
}

/** Returns a snapshot of the full admin state (for the admin API). */
export function getAdminState(): Readonly<AdminState> {
  return { ..._state };
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Resolve the caller's wallet address from a request.
 * JWT sub claim takes precedence over the raw header.
 */
export function resolveCallerAddress(request: Request): string | null {
  const jwt = tryAuthenticateRequest(request);
  if (jwt?.walletAddress) return jwt.walletAddress;
  return request.headers?.get?.("Actor-Wallet-Address")?.trim() || null;
}

/**
 * Verify the caller is the current admin.
 * Returns the admin address on success, or a 403 NextResponse on failure.
 *
 * Mirrors `admin.require_auth()` in the Soroban contract.
 */
export function requireAdmin(request: Request): string | NextResponse {
  const caller = resolveCallerAddress(request);
  if (!caller) {
    return NextResponse.json(
      { error: { code: "Unauthorized", message: "A verified caller identity is required." } },
      { status: 403 },
    );
  }
  if (caller !== _state.adminAddress) {
    return NextResponse.json(
      {
        error: {
          code: "Unauthorized",
          message: "Only the admin may perform this operation.",
        },
      },
      { status: 403 },
    );
  }
  return caller;
}

// ── Privileged operations ─────────────────────────────────────────────────────

/**
 * Toggle the global pause circuit breaker.
 *
 * Gated by admin.require_auth(). When paused:
 *   - create_stream is rejected with ContractPaused (503).
 *   - withdraw is rejected with ContractPaused (503).
 *   - cancel/settle/read ops remain allowed.
 *
 * @param request  Incoming HTTP request (used to verify admin identity).
 * @param paused   true = activate pause; false = lift pause.
 * @returns        Updated AdminState or a NextResponse error.
 */
export function setPaused(
  request: Request,
  paused: boolean,
): AdminState | NextResponse {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  _state.paused   = paused;
  _state.pausedAt = new Date().toISOString();
  return { ..._state };
}

/**
 * Rotate the admin address.
 *
 * Gated by the current admin's auth. The new admin address must be a
 * non-empty string — the admin can never be zeroed accidentally.
 *
 * @param request    Incoming HTTP request (used to verify current admin).
 * @param newAdmin   New admin Stellar address.
 * @returns          Updated AdminState or a NextResponse error.
 */
export function setAdmin(
  request: Request,
  newAdmin: string,
): AdminState | NextResponse {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!newAdmin || newAdmin.trim().length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "Unauthorized",
          message: "new_admin address must not be empty — admin cannot be zeroed.",
        },
      },
      { status: 400 },
    );
  }

  _state.adminAddress    = newAdmin.trim();
  _state.adminRotatedAt  = new Date().toISOString();
  return { ..._state };
}

// ── Upgrade Timelock Functions ───────────────────────────────────────────────

/**
 * Schedule an upgrade with a 48h timelock.
 *
 * Gated by admin auth. Only one upgrade can be scheduled at a time.
 *
 * @param request    Incoming HTTP request (used to verify admin identity).
 * @param data       Opaque upgrade data (e.g., new code hash, config).
 * @returns          Updated AdminState or a NextResponse error.
 */
export function scheduleUpgrade(
  request: Request,
  data: string,
): AdminState | NextResponse {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!data || data.trim().length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "InvalidRequest",
          message: "Upgrade data must not be empty.",
        },
      },
      { status: 400 },
    );
  }

  if (_state.pendingUpgrade && !_state.pendingUpgrade.cancelledAt && !_state.pendingUpgrade.executedAt) {
    return NextResponse.json(
      {
        error: {
          code: "UpgradeAlreadyScheduled",
          message: "An upgrade is already scheduled. Cancel it first before scheduling a new one.",
        },
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const scheduledAt = now.toISOString();
  const executableAt = new Date(now.getTime() + TIMELOCK_MS).toISOString();

  _state.pendingUpgrade = {
    id: `upgrade-${crypto.randomUUID()}`,
    data: data.trim(),
    scheduledAt,
    executableAt,
    executedAt: null,
    cancelledAt: null,
  };

  return { ..._state };
}

/**
 * Cancel a pending upgrade.
 *
 * Gated by admin auth. Only cancels a pending, non-executed upgrade.
 *
 * @param request    Incoming HTTP request (used to verify admin identity).
 * @returns          Updated AdminState or a NextResponse error.
 */
export function cancelUpgrade(
  request: Request,
): AdminState | NextResponse {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!_state.pendingUpgrade || _state.pendingUpgrade.cancelledAt || _state.pendingUpgrade.executedAt) {
    return NextResponse.json(
      {
        error: {
          code: "NoUpgradeScheduled",
          message: "There is no pending upgrade to cancel.",
        },
      },
      { status: 400 },
    );
  }

  _state.pendingUpgrade = {
    ..._state.pendingUpgrade,
    cancelledAt: new Date().toISOString(),
  };

  return { ..._state };
}

/**
 * Execute a scheduled upgrade after the timelock expires.
 *
 * Gated by admin auth. Only executes a scheduled upgrade that is ready.
 *
 * @param request    Incoming HTTP request (used to verify admin identity).
 * @returns          Updated AdminState or a NextResponse error.
 */
export function executeUpgrade(
  request: Request,
): AdminState | NextResponse {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!_state.pendingUpgrade) {
    return NextResponse.json(
      {
        error: {
          code: "NoUpgradeScheduled",
          message: "There is no pending upgrade to execute.",
        },
      },
      { status: 400 },
    );
  }

  if (_state.pendingUpgrade.cancelledAt) {
    return NextResponse.json(
      {
        error: {
          code: "UpgradeCancelled",
          message: "This upgrade has been cancelled.",
        },
      },
      { status: 400 },
    );
  }

  if (_state.pendingUpgrade.executedAt) {
    return NextResponse.json(
      {
        error: {
          code: "UpgradeAlreadyExecuted",
          message: "This upgrade has already been executed.",
        },
      },
      { status: 400 },
    );
  }

  const now = new Date();
  const executableAt = new Date(_state.pendingUpgrade.executableAt);

  if (now < executableAt) {
    return NextResponse.json(
      {
        error: {
          code: "TimelockNotExpired",
          message: `Upgrade timelock not expired. It will be executable at ${executableAt.toISOString()}.`,
        },
      },
      { status: 400 },
    );
  }

  _state.pendingUpgrade = {
    ..._state.pendingUpgrade,
    executedAt: new Date().toISOString(),
  };

  return { ..._state };
}

// ── Circuit-breaker guard ─────────────────────────────────────────────────────

/**
 * Returns a 503 ContractPaused NextResponse when the global pause is active,
 * or null when the operation is allowed.
 *
 * Usage in route handlers:
 *
 *   const pauseError = checkNotPaused("create_stream");
 *   if (pauseError) return pauseError;
 */
export function checkNotPaused(operation: string): NextResponse | null {
  if (!_state.paused) return null;
  return NextResponse.json(
    {
      error: {
        code: "ContractPaused",
        message:
          `The contract is globally paused. '${operation}' is not allowed during an incident. ` +
          "Cancel and settle operations remain available. Contact the admin to lift the pause.",
      },
    },
    { status: 503 },
  );
}

// ── Circuit-breaker per-component toggle ──────────────────────────────────────

/** Recognized circuit breaker targets. */
const VALID_TARGETS = new Set<CircuitBreakerTarget>(["indexer", "webhook"]);

/**
 * Toggle a named circuit breaker (indexer or webhook).
 *
 * Gated by admin auth. When open=true the consuming service should stop
 * dispatching events for that subsystem; when open=false it resumes.
 *
 * @param request  Incoming HTTP request (used to verify admin identity).
 * @param target   "indexer" | "webhook"
 * @param open     true = trip the breaker; false = reset it.
 * @returns        Updated AdminState or a NextResponse error.
 */
export function setCircuitBreaker(
  request: Request,
  target: string,
  open: boolean,
): AdminState | NextResponse {
  const authResult = requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!VALID_TARGETS.has(target as CircuitBreakerTarget)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: `Invalid target '${target}'. Must be one of: ${[...VALID_TARGETS].join(", ")}.`,
        },
      },
      { status: 422 },
    );
  }

  const t = target as CircuitBreakerTarget;
  _state.circuitBreakers[t] = {
    open,
    updatedAt: new Date().toISOString(),
    updatedBy: authResult,
  };

  return { ..._state };
}

/**
 * Returns the current state of all circuit breakers.
 */
export function getCircuitBreakers(): Readonly<Record<CircuitBreakerTarget, CircuitBreakerState>> {
  return { ..._state.circuitBreakers };
}

/**
 * Returns true when the named circuit breaker is open (tripped).
 */
export function isCircuitBreakerOpen(target: CircuitBreakerTarget): boolean {
  return _state.circuitBreakers[target]?.open ?? false;
}

// ── Test helpers ──────────────────────────────────────────────────────────────

/**
 * Reset admin state to defaults. For use in tests only.
 */
export function _resetAdminStateForTesting(adminAddress = DEV_ADMIN_PLACEHOLDER): void {
  _state.adminAddress   = adminAddress;
  _state.paused         = false;
  _state.pausedAt       = null;
  _state.adminRotatedAt = null;
  _state.pendingUpgrade = null;
  _state.circuitBreakers = {
    indexer: { open: false, updatedAt: null, updatedBy: null },
    webhook: { open: false, updatedAt: null, updatedBy: null },
  };
}
