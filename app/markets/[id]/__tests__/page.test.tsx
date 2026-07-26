import React from "react"
import { render, screen } from "@testing-library/react"
import MarketDetailPage, { generateMetadata } from "../page"

// Mock the next/link component
jest.mock("next/link", () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
  MockLink.displayName = "MockLink"
  return MockLink
})

describe("MarketDetailPage", () => {
  it("renders MarketHero details when market is found", async () => {
    const page = await MarketDetailPage({ params: Promise.resolve({ id: "valid-market-id" }) })
    render(page)
    
    // Should render the main heading from getMockMarket
    expect(screen.getByRole("heading", { level: 1, name: /Will Argentina win the 2026 FIFA World Cup\?/i })).toBeInTheDocument()
  })

  it("renders EmptyState when market is not found", async () => {
    const page = await MarketDetailPage({ params: Promise.resolve({ id: "not-found" }) })
    render(page)
    
    // Should render the EmptyState instead of MarketHero
    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: /market not found/i })).toBeInTheDocument()
    expect(screen.getByText(/We couldn't find the prediction market you're looking for/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /browse markets/i })).toHaveAttribute("href", "/events")
  })

  it("renders themed SearchX icon in the EmptyState illustration", async () => {
    const page = await MarketDetailPage({ params: Promise.resolve({ id: "not-found" }) })
    const { container } = render(page)
    
    // The SearchX icon should be rendered inside the EmptyState
    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("generates correct metadata when market is found", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "valid-market" }) })
    expect(metadata.title).toContain("Will Argentina win the 2026 FIFA World Cup?")
  })

  it("generates fallback metadata when market is not found", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ id: "not-found" }) })
    expect(metadata.title).toBe("Market Not Found | Predictify")
  })
})
