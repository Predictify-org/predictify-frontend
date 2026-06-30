"use client";

import { useCallback, useEffect, useState } from "react";

const DRAFT_STORAGE_KEY = "streampay:create-stream:draft";

export interface StreamDraft {
  recipient?: string;
  amount?: string;
  ratePerDay?: string;
  startDate?: string;
  endDate?: string;
  savedAt?: number;
}

export function useDraft() {
  const [draft, setDraftState] = useState<StreamDraft | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        setDraftState(JSON.parse(stored) as StreamDraft);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const saveDraft = useCallback((values: StreamDraft) => {
    const withTimestamp: StreamDraft = { ...values, savedAt: Date.now() };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(withTimestamp));
      setDraftState(withTimestamp);
    } catch {
      // storage may be unavailable
    }
  }, []);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setDraftState(null);
    } catch {
      // ignore
    }
  }, []);

  return { draft, saveDraft, clearDraft };
}
