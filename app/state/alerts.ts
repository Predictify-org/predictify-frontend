"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type PriceAlertKind = "odds_above" | "odds_below" | "deadline_within"

export interface PriceAlert {
  id: string
  marketId: string
  kind: PriceAlertKind
  /** Probability percentage for odds alerts; minutes for deadline alerts. */
  threshold: number
  createdAt: number
  firedAt?: number
}

const MAX_ALERTS_PER_MARKET = 10
const PRICE_ALERT_KINDS: PriceAlertKind[] = [
  "odds_above",
  "odds_below",
  "deadline_within",
]

type AlertUpdate = Partial<Pick<PriceAlert, "kind" | "threshold">>

interface AlertsState {
  alerts: PriceAlert[]
  addAlert: (
    alert: Omit<PriceAlert, "id" | "createdAt" | "firedAt">
  ) => PriceAlert | null
  removeAlert: (id: string) => void
  updateAlert: (id: string, update: AlertUpdate) => void
  rearmAlert: (id: string) => void
  markAlertFired: (id: string, firedAt: number) => void
  clearAlerts: (marketId?: string) => void
}

function isValidThreshold(kind: PriceAlertKind, threshold: number): boolean {
  if (!Number.isFinite(threshold)) return false
  return kind === "deadline_within"
    ? Number.isInteger(threshold) && threshold >= 1 && threshold <= 10080
    : threshold >= 1 && threshold <= 99
}

function isAlert(value: unknown): value is PriceAlert {
  if (!value || typeof value !== "object") return false
  const alert = value as Partial<PriceAlert>
  return (
    typeof alert.id === "string" &&
    alert.id.length > 0 &&
    typeof alert.marketId === "string" &&
    alert.marketId.length > 0 &&
    PRICE_ALERT_KINDS.includes(alert.kind as PriceAlertKind) &&
    typeof alert.threshold === "number" &&
    isValidThreshold(alert.kind as PriceAlertKind, alert.threshold) &&
    typeof alert.createdAt === "number" &&
    Number.isFinite(alert.createdAt) &&
    (alert.firedAt === undefined ||
      (typeof alert.firedAt === "number" && Number.isFinite(alert.firedAt)))
  )
}

function sanitizeAlerts(value: unknown): PriceAlert[] {
  if (!Array.isArray(value)) return []

  const seenIds = new Set<string>()
  const seenConditions = new Set<string>()
  const counts = new Map<string, number>()

  return value.filter((candidate): candidate is PriceAlert => {
    if (!isAlert(candidate) || seenIds.has(candidate.id)) return false

    const condition = `${candidate.marketId}\u0000${candidate.kind}\u0000${candidate.threshold}`
    const count = counts.get(candidate.marketId) ?? 0
    if (seenConditions.has(condition) || count >= MAX_ALERTS_PER_MARKET) {
      return false
    }

    seenIds.add(candidate.id)
    seenConditions.add(condition)
    counts.set(candidate.marketId, count + 1)
    return true
  })
}

function createAlertId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `alert-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      alerts: [],

      addAlert: ({ marketId, kind, threshold }) => {
        if (
          !marketId.trim() ||
          !PRICE_ALERT_KINDS.includes(kind) ||
          !isValidThreshold(kind, threshold)
        ) {
          return null
        }

        const alerts = get().alerts
        const duplicate = alerts.find(
          (alert) =>
            alert.marketId === marketId &&
            alert.kind === kind &&
            alert.threshold === threshold
        )
        if (duplicate) return duplicate

        if (
          alerts.filter((alert) => alert.marketId === marketId).length >=
          MAX_ALERTS_PER_MARKET
        ) {
          return null
        }

        const alert: PriceAlert = {
          id: createAlertId(),
          marketId,
          kind,
          threshold,
          createdAt: Date.now(),
        }
        set({ alerts: [...alerts, alert] })
        return alert
      },

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== id),
        })),

      updateAlert: (id, update) =>
        set((state) => {
          const current = state.alerts.find((alert) => alert.id === id)
          if (!current) return state
          const kind = update.kind ?? current.kind
          const threshold = update.threshold ?? current.threshold
          if (
            !PRICE_ALERT_KINDS.includes(kind) ||
            !isValidThreshold(kind, threshold)
          ) {
            return state
          }

          const duplicate = state.alerts.some(
            (alert) =>
              alert.id !== id &&
              alert.marketId === current.marketId &&
              alert.kind === kind &&
              alert.threshold === threshold
          )
          if (duplicate) return state

          return {
            alerts: state.alerts.map((alert) =>
              alert.id === id
                ? { ...alert, kind, threshold, firedAt: undefined }
                : alert
            ),
          }
        }),

      rearmAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id ? { ...alert, firedAt: undefined } : alert
          ),
        })),

      markAlertFired: (id, firedAt) =>
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === id && alert.firedAt === undefined
              ? { ...alert, firedAt }
              : alert
          ),
        })),

      clearAlerts: (marketId) =>
        set((state) => ({
          alerts: marketId
            ? state.alerts.filter((alert) => alert.marketId !== marketId)
            : [],
        })),
    }),
    {
      name: "predictify-market-alerts",
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persistedAlerts =
          persistedState && typeof persistedState === "object"
            ? (persistedState as Partial<AlertsState>).alerts
            : undefined
        return {
          ...currentState,
          alerts: sanitizeAlerts(persistedAlerts),
        }
      },
    }
  )
)
