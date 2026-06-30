/**
 * Last-seen tracking for developer retention metrics.
 *
 * Records the most-recent request timestamp per authenticated actor, keyed by
 * the actor's `sub` (wallet address).  Timestamps are updated from middleware
 * on every /api/* request so the store reflects real activity without per-route
 * wiring.
 *
 * Security note: `extractActorIdFromAuthHeader` decodes the JWT payload without
 * signature verification — sufficient for this write-only metric, but the
 * actorId it returns must NOT be used for any access-control decision.
 * Verified identity is still handled by `tryAuthenticateRequest` in route
 * handlers.
 */

// ---------------------------------------------------------------------------
// In-memory store:  actorId → ISO-8601 timestamp
// ---------------------------------------------------------------------------

const store = new Map<string, string>();

/**
 * Record that an actor was active.  No-ops on blank actorId.
 * `at` defaults to the current wall-clock time.
 */
export function touchLastSeen(
  actorId: string,
  at: string = new Date().toISOString(),
): void {
  if (!actorId) return;
  store.set(actorId, at);
}

/**
 * Return the ISO-8601 timestamp of the actor's most recent request, or null
 * if they have never been observed.
 */
export function getLastSeen(actorId: string): string | null {
  return store.get(actorId) ?? null;
}

/**
 * Full snapshot of the store — suitable for an analytics export endpoint.
 * The returned ReadonlyMap prevents callers from mutating the backing store.
 */
export function getAllLastSeen(): ReadonlyMap<string, string> {
  return store;
}

/** Flush the store.  Call this in test `beforeEach` for isolation. */
export function resetLastSeenStore(): void {
  store.clear();
}

// ---------------------------------------------------------------------------
// JWT subject extraction (Edge-compatible, intentionally unverified)
// ---------------------------------------------------------------------------

/**
 * Extract the `sub` claim from an `Authorization: Bearer <token>` header by
 * base64url-decoding the payload segment.  No signature verification is
 * performed; the value is used only to key the last-seen store.
 *
 * Returns null when the header is absent, malformed, or carries no `sub`.
 */
export function extractActorIdFromAuthHeader(
  authHeader: string | null,
): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const parts = authHeader.slice(7).split('.');
  if (parts.length !== 3) return null;

  try {
    // base64url → standard base64, then pad to a multiple of 4 for atob().
    // atob() is available in both Edge (V8) and Node.js 16+, so no Buffer dependency.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const sub = payload.sub;
    return typeof sub === 'string' && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Middleware hook — called once per /api/* request
// ---------------------------------------------------------------------------

/**
 * Extract the actor id from the request's Authorization header and call
 * `touchLastSeen`.  Unauthenticated requests (no Bearer token) are silently
 * ignored so the store only contains confirmed developer identities.
 */
export function touchLastSeenFromRequest(request: Request): void {
  const authHeader = request.headers.get('authorization');
  const actorId = extractActorIdFromAuthHeader(authHeader);
  if (actorId) {
    touchLastSeen(actorId);
  }
}
