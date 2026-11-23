"use client"

import { useEffect } from "react"
import { useAlertsStore } from "@/app/state/alerts"
import {
  CURRENT_USER_ID,
  useNotificationsStore,
} from "@/app/state/notifications"
import { evaluateAlerts, snapshotFromEvents } from "@/lib/alert-engine"
import { useEventsStore } from "@/lib/events-store"
import { isQuietHoursActive } from "@/lib/quiet-hours"

export function useAlertEvaluator(): void {
  const events = useEventsStore((state) => state.events)
  const alerts = useAlertsStore((state) => state.alerts)

  useEffect(() => {
    const evaluate = () => {
      const now = Date.now()
      if (isQuietHoursActive(undefined, new Date(now))) return

      const currentAlerts = useAlertsStore.getState().alerts
      const triggered = evaluateAlerts(
        currentAlerts,
        snapshotFromEvents(useEventsStore.getState().events),
        now
      )

      for (const alert of triggered) {
        const market = useEventsStore
          .getState()
          .events.find((event) => event.id === alert.marketId)
        if (!market) continue

        useAlertsStore.getState().markAlertFired(alert.id, now)
        useNotificationsStore.getState().upsertNotification({
          id: `market-alert-${alert.id}-${now}`,
          userId: CURRENT_USER_ID,
          category: "market",
          title: `Market alert: ${market.title}`,
          description:
            alert.kind === "deadline_within"
              ? `This market closes within ${alert.threshold} minutes.`
              : `The implied probability is ${alert.kind === "odds_above" ? "at or above" : "at or below"} ${alert.threshold}%.`,
          timestamp: new Date(now),
          read: false,
          href: "/events",
        })
      }
    }

    evaluate()
    const interval = window.setInterval(evaluate, 30_000)
    return () => window.clearInterval(interval)
  }, [alerts, events])
}
