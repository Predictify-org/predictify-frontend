import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { RecommendationProvenance } from "../recommendation-provenance"

describe("RecommendationProvenance", () => {
  const openProvenance = async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /why am i seeing/i }))
    return user
  }

  it.each([
    [
      "category_match",
      "Category match",
      "You have viewed or predicted on markets in this category before, so this one may be relevant.",
    ],
    [
      "similar_markets",
      "Similar markets",
      "This market is close to other markets you have recently opened or followed.",
    ],
    [
      "trending",
      "Trending now",
      "This market is getting more attention from Predictify users right now.",
    ],
  ])("renders plain-language copy for %s", async (signalKey, title, explanation) => {
    render(<RecommendationProvenance signalKey={signalKey} />)

    await openProvenance()

    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(explanation)).toBeInTheDocument()
  })

  it("falls back safely for an unknown signal", async () => {
    render(<RecommendationProvenance signalKey="new_signal" />)

    await openProvenance()

    expect(screen.getByText("Recommendation signal")).toBeInTheDocument()
    expect(
      screen.getByText(
        "We are showing this because it may be relevant based on recent market activity."
      )
    ).toBeInTheDocument()
  })

  it("uses the default explanation when an empty fallback is provided", async () => {
    render(
      <RecommendationProvenance
        signalKey="new_signal"
        fallbackExplanation="   "
      />
    )

    await openProvenance()

    expect(
      screen.getByText(
        "We are showing this because it may be relevant based on recent market activity."
      )
    ).toBeInTheDocument()
  })

  it("keeps the stop-recommending action keyboard reachable", async () => {
    const onStopRecommending = jest.fn()
    const user = render(
      <RecommendationProvenance
        marketTitle="Will ETH close above $4k?"
        signalKey="trending"
        onStopRecommending={onStopRecommending}
      />
    )

    await openProvenance()
    const stopButton = screen.getByRole("button", {
      name: "Stop recommending Will ETH close above $4k?",
    })

    stopButton.focus()
    expect(stopButton).toHaveFocus()

    await userEvent.keyboard("{Enter}")
    expect(onStopRecommending).toHaveBeenCalledTimes(1)
    user.unmount()
  })
})
