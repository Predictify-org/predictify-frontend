import { useAlertsStore } from "../alerts"

describe("useAlertsStore", () => {
  beforeEach(() => {
    localStorage.clear()
    useAlertsStore.setState({ alerts: [] })
  })

  it("persists alerts scoped to their market", () => {
    const alert = useAlertsStore
      .getState()
      .addAlert({ marketId: "market-1", kind: "odds_above", threshold: 60 })

    expect(alert).not.toBeNull()
    const persisted = JSON.parse(
      localStorage.getItem("predictify-market-alerts") ?? "{}"
    )
    expect(persisted.state.alerts).toEqual([
      expect.objectContaining({ marketId: "market-1", threshold: 60 }),
    ])
  })

  it("rejects invalid thresholds, enforces the cap, and ignores duplicates", () => {
    expect(
      useAlertsStore
        .getState()
        .addAlert({ marketId: "market-1", kind: "odds_above", threshold: 100 })
    ).toBeNull()

    const first = useAlertsStore
      .getState()
      .addAlert({ marketId: "market-1", kind: "odds_above", threshold: 60 })
    expect(
      useAlertsStore
        .getState()
        .addAlert({ marketId: "market-1", kind: "odds_above", threshold: 60 })
    ).toEqual(first)

    for (let threshold = 1; threshold <= 9; threshold += 1) {
      useAlertsStore
        .getState()
        .addAlert({ marketId: "market-1", kind: "odds_below", threshold })
    }
    expect(
      useAlertsStore
        .getState()
        .addAlert({ marketId: "market-1", kind: "deadline_within", threshold: 10 })
    ).toBeNull()
  })

  it("ignores corrupted persisted payloads and removes invalid records", async () => {
    localStorage.setItem("predictify-market-alerts", "not-json")
    await useAlertsStore.persist.rehydrate()
    expect(useAlertsStore.getState().alerts).toEqual([])

    localStorage.setItem(
      "predictify-market-alerts",
      JSON.stringify({
        state: {
          alerts: [
            { id: "bad", marketId: "market-1", kind: "odds_above", threshold: 101 },
            {
              id: "good",
              marketId: "market-1",
              kind: "odds_above",
              threshold: 50,
              createdAt: 1,
            },
          ],
        },
        version: 0,
      })
    )
    await useAlertsStore.persist.rehydrate()
    expect(useAlertsStore.getState().alerts.map((alert) => alert.id)).toEqual([
      "good",
    ])
  })

  it("can re-arm, update, remove, and clear alerts", () => {
    const alert = useAlertsStore
      .getState()
      .addAlert({ marketId: "market-1", kind: "odds_above", threshold: 50 })
    if (!alert) throw new Error("Expected alert to be created")

    useAlertsStore.getState().markAlertFired(alert.id, 100)
    useAlertsStore.getState().rearmAlert(alert.id)
    expect(useAlertsStore.getState().alerts[0].firedAt).toBeUndefined()

    useAlertsStore.getState().updateAlert(alert.id, { threshold: 70 })
    expect(useAlertsStore.getState().alerts[0].threshold).toBe(70)
    useAlertsStore.getState().removeAlert(alert.id)
    useAlertsStore
      .getState()
      .addAlert({ marketId: "market-1", kind: "odds_below", threshold: 30 })
    useAlertsStore.getState().clearAlerts("market-1")
    expect(useAlertsStore.getState().alerts).toEqual([])
  })
})
