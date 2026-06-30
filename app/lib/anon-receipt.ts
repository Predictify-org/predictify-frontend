/**
 * Anonymous read-only receipt sharing.
 *
 * Produces a redacted, read-only projection of a stream receipt that is
 * safe to share publicly: wallet addresses are masked to short prefixes
 * and all PII (email, label, memo, partner id) is stripped. The result
 * carries no `nextAction`, signalling that the view is read-only.
 */

import type { Stream } from "../types/openapi";

/** A redacted, read-only receipt with no recoverable addresses or PII. */
export type AnonymousReceipt = {
  id: string;
  recipientMasked: string;
  senderMasked?: string;
  rate: string;
  schedule: string;
  status: Stream["status"];
  token: string;
  createdAt: string;
  updatedAt: string;
  readonly: true;
};

/**
 * Mask a Stellar address to a short, non-reversible prefix/suffix form,
 * e.g. "GABC…WXYZ". Short or empty values collapse to a generic mask.
 */
export function maskAddress(address: string | undefined | null): string {
  if (typeof address !== "string") return "•••";
  const trimmed = address.trim();
  if (trimmed.length <= 9) return trimmed ? "•••" : "•••";
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

/**
 * Build a shareable, read-only receipt from a full stream. Drops every
 * PII field and replaces addresses with masked prefixes so the receipt
 * can be shared without exposing the parties involved.
 */
export function toAnonymousReceipt(stream: Stream): AnonymousReceipt {
  const receipt: AnonymousReceipt = {
    id: stream.id,
    recipientMasked: maskAddress(stream.recipient),
    rate: stream.rate,
    schedule: stream.schedule,
    status: stream.status,
    token: stream.token,
    createdAt: stream.createdAt,
    updatedAt: stream.updatedAt,
    readonly: true,
  };

  if (stream.senderAddress) {
    receipt.senderMasked = maskAddress(stream.senderAddress);
  }

  return receipt;
}
