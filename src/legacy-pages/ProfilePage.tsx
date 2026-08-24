"use client"

import React, { Suspense, useEffect, useRef } from "react"
import ProfilePageRaw from "@/app/(dashboard)/profile/page"
import { ProfilePageSkeleton } from "../components/Skeleton"
import KbdHint from "../components/KbdHint"

export default function ProfilePage(props: any) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Ctrl/Cmd+S submits the first form on the page (the primary "Save
  // Changes" action) instead of triggering the browser's save dialog.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s"
      if (!isSaveShortcut) return
      const form = containerRef.current?.querySelector("form")
      if (form) {
        event.preventDefault()
        form.requestSubmit()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div ref={containerRef}>
      <div className="flex justify-end px-4 pt-2 text-xs text-muted-foreground sm:px-0">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true">Save</span>
          <KbdHint aria-hidden="true">Ctrl/⌘+S</KbdHint>
          <span className="sr-only">
            Keyboard shortcut: press Control+S, or Command+S on Mac, to save your profile.
          </span>
        </span>
      </div>
      <Suspense fallback={<ProfilePageSkeleton />}>
        <ProfilePageRaw {...props} />
      </Suspense>
    </div>
  )
}

export * from "@/app/(dashboard)/profile/page"
