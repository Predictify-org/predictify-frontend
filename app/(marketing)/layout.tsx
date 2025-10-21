import type { ReactNode } from "react"
import Navbar from "./_components/navbar"

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}