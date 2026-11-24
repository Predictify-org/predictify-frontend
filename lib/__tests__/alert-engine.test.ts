import type { PriceAlert } from "@/app/state/alerts"
import type { Event } from "@/types/events"
import { evaluateAlerts, snapshotFromEvents } from "../alert-engine"

const alert = (
  kind: PriceAlert["kind"],
  threshold: number,
  firedAt?: number
): PriceAlert => ({
  id: `${kind}-${threshold}`,
  marketId: "market-1",
  kind,
  threshold,
  createdAt: 1,
  firedAt,
})

const event: Event = {
  id: "market-1",
  title: "Test market",
  txHash: "hash",
  category: "Crypto",
  odds: 2,
  startDate: "2026-01-01T00:00:00.000Z",
  endDate: "2026-08-28T12:05:00.000Z",
  status: "ongoing",
  participants: 10,
}

describe("alert engine", () => {
  it("evaluates probability conditions including an already-satisfied threshold", () => {
    const snapshot = snapshotFromEvents([event])
    expect(
      evaluateAlerts(
        [alert("odds_above", 50), alert("odds_below", 40)],
        snapshot,
        Date.parse("2026-08-28T12:00:00.000Z")
      ).map(({ kind }) => kind)
    ).toEqual(["odds_above"])
  })

  it("does not trigger a fired alert during threshold oscillation", () => {
    const fired = alert("odds_above", 50, 20)
    expect(
      evaluateAlerts([fired], snapshotFromEvents([event]), 30)
    ).toEqual([])
  })

  it("triggers a deadline alert only before its deadline", () => {
    const snapshot = snapshotFromEvents([event])
    const deadlineAlert = alert("deadline_within", 5)
    const now = Date.parse("2026-08-28T12:00:00.000Z")
    expect(evaluateAlerts([deadlineAlert], snapshot, now)).toEqual([
      deadlineAlert,
    ])
    expect(
      evaluateAlerts([deadlineAlert], snapshot, Date.parse(event.endDate))
    ).toEqual([])
  })

  it("does not trigger duplicate alert IDs twice", () => {
    const duplicate = alert("odds_above", 50)
    expect(
      evaluateAlerts(
        [duplicate, { ...duplicate }],
        snapshotFromEvents([event]),
        1
      )
    ).toEqual([duplicate])
  })
})
