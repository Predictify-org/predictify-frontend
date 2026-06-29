"use client";

import { useMemo, useState } from "react";

export type BatchPauseStream = {
  id: string;
  recipient: string;
  status: string;
};

type BatchPauseModalProps = {
  streams: BatchPauseStream[];
  /** Invoked with the selected recipient and the ids of their active streams. */
  onConfirm: (recipient: string, streamIds: string[]) => void;
  onClose: () => void;
};

/** Groups active streams by recipient so the user can pause them in one action. */
export function groupActiveByRecipient(
  streams: BatchPauseStream[],
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const s of streams) {
    if (s.status !== "active") continue;
    const ids = groups.get(s.recipient) ?? [];
    ids.push(s.id);
    groups.set(s.recipient, ids);
  }
  return groups;
}

/**
 * Modal that lets a user pause every active stream for a chosen recipient in a
 * single batch action. Recipients with no active streams are not offered.
 */
export function BatchPauseModal({
  streams,
  onConfirm,
  onClose,
}: BatchPauseModalProps) {
  const groups = useMemo(() => groupActiveByRecipient(streams), [streams]);
  const recipients = useMemo(() => Array.from(groups.keys()), [groups]);
  const [selected, setSelected] = useState<string>(recipients[0] ?? "");

  const selectedIds = groups.get(selected) ?? [];

  return (
    <div className="batch-pause-modal" role="dialog" aria-label="Pause all by recipient">
      <h2>Pause all by recipient</h2>

      {recipients.length === 0 ? (
        <p className="batch-pause-modal__empty">No active streams to pause.</p>
      ) : (
        <>
          <ul className="batch-pause-modal__list">
            {recipients.map((recipient) => (
              <li key={recipient}>
                <label>
                  <input
                    type="radio"
                    name="batch-pause-recipient"
                    value={recipient}
                    checked={selected === recipient}
                    onChange={() => setSelected(recipient)}
                  />
                  {recipient}{" "}
                  <span className="batch-pause-modal__count">
                    ({groups.get(recipient)?.length ?? 0} active)
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="batch-pause-modal__confirm"
            onClick={() => onConfirm(selected, selectedIds)}
            disabled={selectedIds.length === 0}
          >
            Pause {selectedIds.length} stream
            {selectedIds.length === 1 ? "" : "s"}
          </button>
        </>
      )}

      <button type="button" className="batch-pause-modal__close" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
