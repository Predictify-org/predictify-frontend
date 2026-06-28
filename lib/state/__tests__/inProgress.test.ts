import {
  clearInProgressPrediction,
  dismissInProgressPrediction,
  getInProgressPrediction,
  getVisibleInProgressPrediction,
  isInProgressDismissed,
  saveInProgressPrediction,
  type InProgressPrediction,
} from "../inProgress"

const sample: InProgressPrediction = {
  id: "draft-1",
  marketId: "eth-weekly-close",
  marketTitle: "Will ETH close above $4,000 this week?",
  href: "/events/eth-weekly-close",
  step: "sign",
  stakeAmount: "$100.00",
  savedAt: Date.now(),
}

describe("inProgress state", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns null when nothing is saved", () => {
    expect(getInProgressPrediction()).toBeNull()
    expect(getVisibleInProgressPrediction()).toBeNull()
  })

  it("persists and reads an in-progress prediction", () => {
    saveInProgressPrediction(sample)
    expect(getInProgressPrediction()).toEqual(sample)
    expect(getVisibleInProgressPrediction()).toEqual(sample)
  })

  it("hides a dismissed prediction until a new draft is saved", () => {
    saveInProgressPrediction(sample)
    dismissInProgressPrediction(sample.id)

    expect(isInProgressDismissed(sample.id)).toBe(true)
    expect(getVisibleInProgressPrediction()).toBeNull()
    expect(getInProgressPrediction()).toEqual(sample)
  })

  it("clears stored prediction data", () => {
    saveInProgressPrediction(sample)
    dismissInProgressPrediction(sample.id)

    clearInProgressPrediction()

    expect(getInProgressPrediction()).toBeNull()
    expect(isInProgressDismissed(sample.id)).toBe(false)
  })
})
