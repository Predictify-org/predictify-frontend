import React, { Suspense } from "react"
import MarketDetailPageRaw from "@/app/markets/[id]/page"
import { Skeleton } from "../components/Skeleton"

export default function MarketDetailPage(props: any) {
  return (
    <Suspense fallback={<Skeleton />}>
      <MarketDetailPageRaw {...props} />
    </Suspense>
  )
}
export * from "@/app/markets/[id]/page"
