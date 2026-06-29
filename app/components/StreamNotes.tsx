"use client";

import { useEffect, useRef, useState } from "react";

const MAX_NOTE_LENGTH = 1000;
const STORAGE_KEY_PREFIX = "streampay:stream-notes:";

type StreamNotesProps = {
  streamId: string;
};

export function StreamNotes({ streamId }: StreamNotesProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${streamId}`;
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setNotes(stored);
    } catch {
      // storage unavailable
    }
  }, [storageKey]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setNotes(value);
    setSaved(false);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, value);
        setSaved(true);
      } catch {
        // ignore
      }
    }, 800);
  }

  const remaining = MAX_NOTE_LENGTH - notes.length;

  return (
    <section aria-labelledby="stream-notes-label" className="stream-notes">
      <label id="stream-notes-label" className="stream-notes__label" htmlFor="stream-notes-textarea">
        Notes
      </label>
      <textarea
        id="stream-notes-textarea"
        aria-describedby="stream-notes-hint"
        className="stream-notes__textarea"
        maxLength={MAX_NOTE_LENGTH}
        placeholder="Add private notes about this stream…"
        rows={4}
        value={notes}
        onChange={handleChange}
      />
      <div id="stream-notes-hint" className="stream-notes__hint" aria-live="polite">
        {saved ? "Saved" : `${remaining} characters remaining`}
      </div>
    </section>
  );
}
