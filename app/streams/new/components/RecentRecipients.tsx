"use client";

import React, { useEffect, useState } from "react";
import {
  getRecentRecipients,
  RecentRecipient,
} from "../../../state/recentRecipients";

export interface RecentRecipientsProps {
  /** Called with the full address when the user clicks a recent-recipient pill. */
  onSelect: (address: string) => void;
  /** Optional additional CSS class for the wrapper element. */
  className?: string;
}

/** Returns the first `chars` + "…" + last `chars` characters of `address`. */
function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/**
 * RecentRecipients — quick-pick rail showing the last 6 addresses used in the
 * create-stream form.  Reads from localStorage on mount and renders nothing
 * when the list is empty (e.g. first-time users).
 *
 * Accessibility
 * - Landmark-free; the outer `<div>` has an `aria-label` describing the region.
 * - Each pill is a `<button type="button">` with a full-address `aria-label`
 *   so screen readers announce the untruncated value.
 * - Focus ring is provided by the `.recent-recipients__pill:focus-visible` rule
 *   in globals.css (WCAG 2.1 AA compliant, 2 px accent-colour outline).
 *
 * @example
 * <RecentRecipients onSelect={(addr) => setRecipient(addr)} />
 */
export function RecentRecipients({
  onSelect,
  className = "",
}: RecentRecipientsProps) {
  const [recipients, setRecipients] = useState<RecentRecipient[]>([]);

  useEffect(() => {
    setRecipients(getRecentRecipients());
  }, []);

  if (recipients.length === 0) return null;

  return (
    <div
      className={`recent-recipients${className ? ` ${className}` : ""}`}
      aria-label="Recently used recipients"
    >
      <p className="recent-recipients__label" aria-hidden="true">
        Recent
      </p>
      <ul role="list" className="recent-recipients__rail">
        {recipients.map((r) => (
          <li key={r.address} className="recent-recipients__item">
            <button
              type="button"
              className="recent-recipients__pill"
              onClick={() => onSelect(r.address)}
              aria-label={`Use recent recipient ${r.address}`}
              title={r.address}
            >
              {truncateAddress(r.address)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
