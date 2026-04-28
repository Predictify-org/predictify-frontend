import { Stream, User } from "@/app/types/openapi";
import { db } from "./db";

/**
 * Retention period: 7 years in milliseconds.
 */
const RETENTION_PERIOD_MS = 7 * 365 * 24 * 60 * 60 * 1000;

/**
 * Mask an email address for non-admin roles.
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Scrub PII from a stream object based on the requester's role.
 * Role 'admin' sees everything; 'user' sees masked/redacted data.
 */
export function scrubStreamPII(stream: Stream, role: 'admin' | 'user' = 'user'): Stream {
  if (role === 'admin') return stream;

  return {
    ...stream,
    email: stream.email ? maskEmail(stream.email) : undefined,
    label: stream.label ? "[REDACTED]" : undefined,
    memo: stream.memo ? "[REDACTED]" : undefined,
    partnerId: stream.partnerId ? "[MASKED]" : undefined,
  };
}

/**
 * Check if a record is past its retention period.
 */
export function isPastRetention(createdAt: string): boolean {
  const createdDate = new Date(createdAt).getTime();
  const now = Date.now();
  return now - createdDate > RETENTION_PERIOD_MS;
}

/**
 * Process an account deletion request (DSR).
 * Permanently scrubs PII from streams and deletes the user record.
 * Legal/Audit requirement: Keep stream aggregates (IDs, amounts, status) for 7 years.
 */
export async function processDeletionRequest(walletAddress: string): Promise<{ requestId: string; status: string }> {
  // 1. Scrub PII from all streams associated with this user
  // In a real DB, we'd query by user_id. Here we check recipient and email.
  const user = db.users.get(walletAddress);
  const userEmail = user?.email;
  const userName = user?.display_name;

  for (const [id, stream] of db.streams.entries()) {
    const isAssociated = 
      stream.email === userEmail || 
      (userName && stream.recipient.includes(userName)) ||
      stream.recipient.includes(walletAddress);

    if (isAssociated) {
      db.streams.set(id, {
        ...stream,
        email: undefined,
        label: undefined,
        memo: undefined,
        partnerId: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 2. Delete user record
  db.users.delete(walletAddress);

  return {
    requestId: `dsr-${Math.random().toString(36).slice(2, 11)}`,
    status: "processing",
  };
}
