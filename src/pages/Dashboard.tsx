import React from "react"
import { StellarWaveEmptyState } from "../components/EmptyState"

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <StellarWaveEmptyState />
    </div>
  )
}
