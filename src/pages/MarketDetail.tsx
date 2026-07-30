import React, { Suspense } from "react"
import MarketDetailPageRaw from "@/app/markets/[id]/page"
import { Skeleton } from "../components/Skeleton"
import "../styles/focus.css"

export default function MarketDetailPage(props: any) {
  return (
    <div className="market-detail-page">
      <Suspense fallback={<Skeleton />}>
        <MarketDetailPageRaw {...props} />
      </Suspense>
    </div>
  )
}
export * from "@/app/markets/[id]/page"
