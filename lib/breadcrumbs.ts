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

/** Max characters shown for a single crumb label before it gets middle-ellipsized. */
export const MAX_LABEL_LENGTH = 24

/**
 * Shortens a label to `maxLength` by cutting out its middle and splicing in
 * an ellipsis, e.g. "Verification Requirements" -> "Verific…irements".
 * Keeping the start and end (rather than just the start, as `text-overflow:
 * ellipsis` would) preserves whichever edge carries the more identifying
 * information for a given label.
 */
export function truncateMiddle(label: string, maxLength: number = MAX_LABEL_LENGTH): string {
  if (label.length <= maxLength) return label

  const charsToShow = maxLength - 1 // reserve one character for the ellipsis
  const frontChars = Math.ceil(charsToShow / 2)
  const backChars = Math.floor(charsToShow / 2)

  return `${label.slice(0, frontChars)}…${backChars > 0 ? label.slice(-backChars) : ""}`
}

/** Max number of crumbs shown before the middle of the trail collapses into an ellipsis. */
export const MAX_VISIBLE_CRUMBS = 4

export interface BreadcrumbEllipsisItem {
  label: "…"
  isEllipsis: true
  collapsedItems: BreadcrumbItem[]
}

export type BreadcrumbTrailItem = BreadcrumbItem | BreadcrumbEllipsisItem

/**
 * Collapses a long breadcrumb trail down to `maxVisible` entries by replacing
 * the middle of the trail with a single ellipsis entry, e.g. for maxVisible=4:
 * "Dashboard / Events / Q3 / Disputes / Item 12 / Review" ->
 * "Dashboard / … / Item 12 / Review" (the ellipsis carries the hidden crumbs
 * so the UI can still surface them, e.g. via a dropdown).
 *
 * The root and the last two crumbs (immediate parent + current page) always
 * stay visible so users keep their "where am I" and "how do I get back to
 * the top" anchors even when the middle of the path is hidden.
 */
export function collapseBreadcrumbTrail(
  items: BreadcrumbItem[],
  maxVisible: number = MAX_VISIBLE_CRUMBS
): BreadcrumbTrailItem[] {
  if (items.length <= maxVisible) return items

  const first = items[0]
  const lastTwo = items.slice(-2)
  const collapsedItems = items.slice(1, -2)

  return [
    first,
    { label: "…", isEllipsis: true, collapsedItems },
    ...lastTwo,
  ]
}
