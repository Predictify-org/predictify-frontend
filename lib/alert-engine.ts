import type { PriceAlert } from "@/app/state/alerts"
import type { Event } from "@/types/events"

export interface MarketAlertSnapshot {
  marketId: string
  title: string
  /** Implied probability as a percentage from 1 to 99. */
  probability?: number
  deadlineAt?: number
}

export function snapshotFromEvents(events: Event[]): MarketAlertSnapshot[] {
  return events.map((event) => ({
    marketId: event.id,
    title: event.title,
    probability:
      Number.isFinite(event.odds) && event.odds > 0
        ? Math.min(99, Math.max(1, 100 / event.odds))
        : undefined,
    deadlineAt: Date.parse(event.endDate),
  }))
}

export function evaluateAlerts(
  alerts: PriceAlert[],
  snapshot: MarketAlertSnapshot[],
  now: number | Date = Date.now()
): PriceAlert[] {
  const currentTime = now instanceof Date ? now.getTime() : now
  const markets = new Map(snapshot.map((item) => [item.marketId, item]))
  const seen = new Set<string>()

  return alerts.filter((alert) => {
    if (alert.firedAt !== undefined || seen.has(alert.id)) return false
    seen.add(alert.id)

    const market = markets.get(alert.marketId)
    if (!market) return false

    if (alert.kind === "odds_above") {
      return (
        market.probability !== undefined &&
        market.probability >= alert.threshold
      )
    }

    if (alert.kind === "odds_below") {
      return (
        market.probability !== undefined &&
        market.probability <= alert.threshold
      )
    }

    if (market.deadlineAt === undefined || market.deadlineAt <= currentTime) {
      return false
    }

    const remaining = market.deadlineAt - currentTime
    return remaining <= alert.threshold * 60_000
  })
}
