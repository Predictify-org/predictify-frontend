import React, { Suspense } from "react"
import ProfilePageRaw from "@/app/(dashboard)/profile/page"
import { ProfilePageSkeleton } from "../components/Skeleton"

export default function ProfilePage(props: any) {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <ProfilePageRaw {...props} />
    </Suspense>
  )
}

export * from "@/app/(dashboard)/profile/page"
