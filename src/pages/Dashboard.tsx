import React from "react"
import { StellarWaveEmptyState } from "../components/EmptyState"
import "../styles/print.css";

/**
 * Dashboard page component (Legacy Pages Router).
 *
 * Issue #651: Polish Dashboard layout for narrow (mobile) viewports (≤375px).
 *
 * Responsive layout strategy:
 * - Padding scales: p-4 (mobile) → sm:p-6 (≥640px) → lg:p-8 (≥1024px)
 *   to prevent content from touching screen edges on narrow viewports.
 * - Heading font size: text-2xl (mobile) → sm:text-3xl (≥640px) so the
 *   title remains legible without consuming excessive vertical space on
 *   small screens.
 * - Heading bottom margin: mb-4 (mobile) → sm:mb-6 (≥640px) to maintain
 *   comfortable vertical rhythm at every breakpoint.
 * - Focus ring: Uses the global .dashboard-container:focus-visible CSS
 *   layer (src/styles/focus.css) for WCAG 2.1 AA 3:1 contrast ratio.
 * - Tap targets: All interactive elements maintain ≥44×44px minimum
 *   (WCAG 2.5.5) via Button size="lg" in the StellarWaveEmptyState.
 *
 * Issue #805: Add print stylesheet section for Dashboard.
 * - Chrome (navigation + interactive controls) is hidden via .dashboard-chrome.
 * - Collapsible sections are expanded when printing so the printed Dashboard
 *   shows all content without requiring user interaction.
 */
export default function Dashboard() {
  return (
    <div
      className="dashboard-container p-4 sm:p-6 lg:p-8"
      tabIndex={0}
      aria-label="Dashboard"
      role="region"
    >
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
        Dashboard
      </h1>
      <div className="dashboard-chrome">
        <StellarWaveEmptyState />
      </div>
    </div>
  )
}