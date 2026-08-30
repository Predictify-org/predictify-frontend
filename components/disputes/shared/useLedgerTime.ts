'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type LedgerTimeStatus =
  | 'loading'
  | 'ready'
  | 'stale'
  | 'error'
  | 'permission';

interface LedgerTimeState {
  ledgerTime: Date | null;
  ledgerSequence: number | null;
  status: LedgerTimeStatus;
  error: string | null;
}

interface LedgerTimePayload {
  ledgerTime: string;
  ledgerSequence: number;
}

const POLL_INTERVAL_MS = 5000;

function parseLedgerPayload(payload: unknown): LedgerTimePayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('ledgerTime' in payload) ||
    !('ledgerSequence' in payload)
  ) {
    throw new Error('Invalid ledger time response.');
  }

  const ledgerTime = (payload as LedgerTimePayload).ledgerTime;
  const ledgerSequence = (payload as LedgerTimePayload).ledgerSequence;

  if (
    typeof ledgerTime !== 'string' ||
    Number.isNaN(new Date(ledgerTime).getTime()) ||
    !Number.isSafeInteger(ledgerSequence) ||
    ledgerSequence < 0
  ) {
    throw new Error('Invalid ledger time response.');
  }

  return {
    ledgerTime,
    ledgerSequence,
  };
}

/**
 * Returns the latest authoritative Stellar ledger close time.
 *
 * Invariants:
 * - Browser wall-clock time is never used to decide dispute deadline status.
 * - Older/out-of-order ledger responses never overwrite newer ledger state.
 * - A failed refresh keeps the last successful ledger snapshot.
 * - Actions can fail closed while ledger state is stale or unavailable.
 */
export function useLedgerTime() {
  const [state, setState] = useState<LedgerTimeState>({
    ledgerTime: null,
    ledgerSequence: null,
    status: 'loading',
    error: null,
  });

  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestSequenceRef = useRef<number | null>(null);
  const latestTimeRef = useRef<number | null>(null);

  const loadLedgerTime = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/ledger-time', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (response.status === 401 || response.status === 403) {
        setState((previous) => ({
          ...previous,
          status: 'permission',
          error: 'Unable to verify ledger time because access was denied.',
        }));
        return;
      }

      if (!response.ok) {
        throw new Error('Unable to retrieve ledger time.');
      }

      const payload = parseLedgerPayload(await response.json());
      const nextTime = new Date(payload.ledgerTime);
      const nextTimeMs = nextTime.getTime();

      const previousSequence = latestSequenceRef.current;
      const previousTime = latestTimeRef.current;

      // Never allow an older response to replace a newer ledger snapshot.
      if (
        previousSequence !== null &&
        payload.ledgerSequence < previousSequence
      ) {
        return;
      }

      // The same ledger sequence must always have the same close time.
      if (
        previousSequence !== null &&
        previousTime !== null &&
        payload.ledgerSequence === previousSequence &&
        nextTimeMs !== previousTime
      ) {
        throw new Error('Inconsistent ledger time response.');
      }

      latestSequenceRef.current = payload.ledgerSequence;
      latestTimeRef.current = nextTimeMs;

      setState({
        ledgerTime: nextTime,
        ledgerSequence: payload.ledgerSequence,
        status: 'ready',
        error: null,
      });
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return;
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      setState((previous) => ({
        ...previous,
        status: previous.ledgerTime ? 'stale' : 'error',
        error: previous.ledgerTime
          ? 'Ledger time could not be refreshed. Actions are paused until it is current.'
          : 'Ledger time is temporarily unavailable.',
      }));
    }
  }, []);

  const retry = useCallback(() => {
    void loadLedgerTime();
  }, [loadLedgerTime]);

  useEffect(() => {
    void loadLedgerTime();

    const intervalId = window.setInterval(() => {
      void loadLedgerTime();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, [loadLedgerTime]);

  return {
    ...state,
    retry,
  };
}