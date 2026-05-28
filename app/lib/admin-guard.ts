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
 * ## Contract errors (mapped to HTTP)
 *   - Unauthorized    → 403  (non-admin attempted a privileged op)
 *   - ContractPaused  → 503  (global pause is active)
 *
 * ## What is blocked when paused
 *   - create_stream  (POST /api/streams)
 *   - withdraw       (POST /api/streams/:id/withdraw)
 *
 * ## What remains allowed when paused
 *   - cancel_stream  — recipients must always be able to cancel to recover vested funds
 *   - settle         — settlement of already-active streams is allowed to prevent fund lock
 *   - read endpoints — GET routes are never blocked
 *
 * ## Admin bootstrap
 * The admin address is seeded from the STREAMPAY_ADMIN_ADDRESS env var at
 * module load. In development, a placeholder is used with a warning.
 * In production, the env var is required (fail-fast).
 */

import { NextResponse } from "next/server";
import { tryAuthenticateRequest } from "./auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminState {
  /** Stellar G... address of the current admin. Never null after init. */
  adminAddress: string;
  /** Whether the global pause circuit breaker is active. */
  paused: boolean;
  /** ISO-8601 timestamp of the last pause toggle. */
  pausedAt: string | null;
  /** ISO-8601 timestamp of the last admin rotation. */
  adminRotatedAt: string | null;
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

// ── Test helpers ──────────────────────────────────────────────────────────────

/**
 * Reset admin state to defaults. For use in tests only.
 */
export function _resetAdminStateForTesting(adminAddress = DEV_ADMIN_PLACEHOLDER): void {
  _state.adminAddress   = adminAddress;
  _state.paused         = false;
  _state.pausedAt       = null;
  _state.adminRotatedAt = null;
}
