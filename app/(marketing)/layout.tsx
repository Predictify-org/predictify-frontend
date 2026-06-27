import type { ReactNode } from "react"
import { MarketingCursorFollower } from "@/components/marketing/cursor-follower"
import { ErrorBoundary } from "@/components/error-boundary"

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <MarketingCursorFollower />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  )
}