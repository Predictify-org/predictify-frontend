"use client"

import * as React from "react"

interface LiveRegionProps {
  /** The message to announce. Changing this value triggers a new announcement. */
  message: string
}

/**
 * Invisible ARIA live region for screen-reader announcements.
 * Uses aria-live="polite" (WCAG 2.1 SC 4.1.3).
 * Deduplication: clears then re-sets the message in a short timeout so the
 * same string re-announces on repeated events without accumulating DOM nodes.
 */
export function LiveRegion({ message }: LiveRegionProps) {
  const [announced, setAnnounced] = React.useState("")

  React.useEffect(() => {
    if (!message) return
    // Clear first so identical messages still re-trigger the live region
    setAnnounced("")
    const id = setTimeout(() => setAnnounced(message), 50)
    return () => clearTimeout(id)
  }, [message])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announced}
    </div>
  )
}
