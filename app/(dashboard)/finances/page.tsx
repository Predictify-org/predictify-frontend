"use client"

import { FinancesView } from "./FinancesView"
import { mockPortfolioPositions } from "@/lib/mock-data"

export default function FinancesPage() {
  return <FinancesView positions={mockPortfolioPositions} />
}
