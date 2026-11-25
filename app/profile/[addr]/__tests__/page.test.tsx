import React from "react"
import { render, screen } from "@testing-library/react"
import ProfilePage from "../page"
import { getPredictionHistory } from "@/lib/prediction-history"
import type { PredictionRecord } from "@/lib/track-record"

jest.mock("@/lib/prediction-history", () => ({
  getPredictionHistory: jest.fn(),
}))

jest.mock("@/components/profile/ProfileShareCard", () => ({
  ProfileShareCard: () => <div data-testid="profile-share-card" />,
}))

const validAddress = `G${"A".repeat(55)}`
const mockGetPredictionHistory = jest.mocked(getPredictionHistory)

async function renderProfile(addr: string) {
  const page = await ProfilePage({ params: Promise.resolve({ addr }) })
  return render(page)
}

describe("public profile track record", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPredictionHistory.mockResolvedValue([])
  })

  it("shows invalid addresses without requesting prediction history", async () => {
    await renderProfile("not-a-stellar-address")

    expect(screen.getByText("Invalid Stellar address")).toBeInTheDocument()
    expect(mockGetPredictionHistory).not.toHaveBeenCalled()
  })

  it("shows a loading skeleton while valid profile history is loading", async () => {
    mockGetPredictionHistory.mockReturnValue(
      new Promise<PredictionRecord[]>(() => {}),
    )
    await renderProfile(validAddress)

    expect(screen.getByRole("status", { name: "Loading profile" })).toBeInTheDocument()
  })

  it("shows the empty state when a valid address has no prediction history", async () => {
    await renderProfile(validAddress)

    expect(await screen.findByText("No predictions yet")).toBeInTheDocument()
    expect(mockGetPredictionHistory).toHaveBeenCalledWith(
      validAddress,
      expect.any(AbortSignal),
    )
  })

  it("renders derived accuracy, streak, category and badge data", async () => {
    const history: PredictionRecord[] = Array.from({ length: 20 }, (_, index) => ({
      id: `record-${String(index).padStart(2, "0")}`,
      category: index % 2 === 0 ? "Crypto" : "Football",
      status: index < 16 ? "won" : "lost",
      resolvedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    }))
    mockGetPredictionHistory.mockResolvedValue(history)
    await renderProfile(validAddress)

    expect(await screen.findByText("80%")).toBeInTheDocument()
    expect(screen.getAllByText(/80% · 8\/10/)).toHaveLength(2)
    expect(screen.getByText("Crypto")).toBeInTheDocument()
    expect(screen.getByText("Football")).toBeInTheDocument()
    expect(screen.getByText("Hot Streak")).toBeInTheDocument()
    expect(screen.getByText("Veteran Predictor")).toBeInTheDocument()
    expect(screen.getByText("Sharp Shooter")).toBeInTheDocument()
    expect(screen.getByText("Longest streak")).toBeInTheDocument()
  })
})
