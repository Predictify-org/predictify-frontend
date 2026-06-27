import type { ReactNode } from "react"
import { MarketingCursorFollower } from "@/components/marketing/cursor-follower"

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <MarketingCursorFollower />
      {children}
    </div>
  )
}