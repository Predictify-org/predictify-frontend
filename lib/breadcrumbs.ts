/**
 * Maps dashboard route segments to human-readable breadcrumb labels.
 * Unlisted segments fall back to a humanized version of the slug
 * (see `humanizeSegment`), so new routes don't need an entry here to work.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  events: "Events",
  new: "New Event",
  "event-page": "Event Details",
  "events-virtualized": "Events (Virtualized)",
  bets: "Bets",
  disputes: "Disputes",
  mypredictions: "My Predictions",
  finances: "Finances",
  profile: "Profile",
  settings: "Settings",
  verification: "Verification",
  help: "Help",
}

function humanizeSegment(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

export interface BreadcrumbItem {
  label: string
  href?: string
  isCurrentPage?: boolean
}

/**
 * Derives a breadcrumb trail from a dashboard pathname, e.g.
 * "/events/new" -> [Dashboard (/dashboard), Events (/events), New Event (current)].
 *
 * The trail always leads with "Dashboard" (except when the path *is*
 * "/dashboard") so every route has a consistent depth-1 root to morph from.
 */
export function getBreadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return []

  const items: BreadcrumbItem[] = []
  if (segments[0] !== "dashboard") {
    items.push({ label: "Dashboard", href: "/dashboard" })
  }

  let pathSoFar = ""
  segments.forEach((segment, index) => {
    pathSoFar += `/${segment}`
    const isLast = index === segments.length - 1
    items.push({
      label: humanizeSegment(segment),
      ...(isLast ? { isCurrentPage: true } : { href: pathSoFar }),
    })
  })

  return items
}
