import { getBreadcrumbsForPath, truncateMiddle, collapseBreadcrumbTrail } from "../breadcrumbs"

describe("getBreadcrumbsForPath", () => {
  it("returns a single, current, unlinked crumb for the dashboard root", () => {
    expect(getBreadcrumbsForPath("/dashboard")).toEqual([
      { label: "Dashboard", isCurrentPage: true },
    ])
  })

  it("leads with a linked Dashboard root for a depth-2 route", () => {
    expect(getBreadcrumbsForPath("/events")).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Events", isCurrentPage: true },
    ])
  })

  it("builds a full trail for a depth-3 route, linking every ancestor", () => {
    expect(getBreadcrumbsForPath("/events/new")).toEqual([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Events", href: "/events" },
      { label: "New Event", isCurrentPage: true },
    ])
  })

  it("uses the known label map for event-page", () => {
    const items = getBreadcrumbsForPath("/events/event-page")
    expect(items[items.length - 1]).toEqual({
      label: "Event Details",
      isCurrentPage: true,
    })
  })

  it("humanizes unknown segments instead of failing", () => {
    const items = getBreadcrumbsForPath("/some-new-section")
    expect(items[items.length - 1].label).toBe("Some New Section")
  })

  it("returns an empty trail for the root path", () => {
    expect(getBreadcrumbsForPath("/")).toEqual([])
  })

  it("ignores trailing slashes and query-string-free duplicate slashes", () => {
    expect(getBreadcrumbsForPath("/events/")).toEqual(getBreadcrumbsForPath("/events"))
  })
})

describe("truncateMiddle", () => {
  it("returns the label unchanged when it fits within maxLength", () => {
    expect(truncateMiddle("Settings", 24)).toBe("Settings")
  })

  it("returns the label unchanged when it is exactly maxLength", () => {
    const label = "a".repeat(24)
    expect(truncateMiddle(label, 24)).toBe(label)
  })

  it("splices an ellipsis into the middle of a label longer than maxLength", () => {
    const result = truncateMiddle("Verification Requirements", 20)
    expect(result).toHaveLength(20)
    expect(result).toContain("…")
    expect(result.startsWith("Verific")).toBe(true)
    expect(result.endsWith("ments")).toBe(true)
  })

  it("uses the default MAX_LABEL_LENGTH when no length is given", () => {
    const longLabel = "A".repeat(50)
    const result = truncateMiddle(longLabel)
    expect(result.length).toBeLessThan(longLabel.length)
    expect(result).toContain("…")
  })
})

describe("collapseBreadcrumbTrail", () => {
  const dashboard = { label: "Dashboard", href: "/dashboard" }
  const events = { label: "Events", href: "/events" }
  const q3 = { label: "Q3", href: "/events/q3" }
  const disputes = { label: "Disputes", href: "/events/q3/disputes" }
  const item12 = { label: "Item 12", href: "/events/q3/disputes/item-12" }
  const review = { label: "Review", isCurrentPage: true }

  it("returns the trail unchanged when it fits within maxVisible", () => {
    const items = [dashboard, events, review]
    expect(collapseBreadcrumbTrail(items, 4)).toEqual(items)
  })

  it("returns the trail unchanged when it exactly equals maxVisible", () => {
    const items = [dashboard, events, q3, review]
    expect(collapseBreadcrumbTrail(items, 4)).toEqual(items)
  })

  it("collapses the middle of a long trail, keeping the root and last two crumbs", () => {
    const items = [dashboard, events, q3, disputes, item12, review]
    const collapsed = collapseBreadcrumbTrail(items, 4)

    expect(collapsed).toHaveLength(4)
    expect(collapsed[0]).toEqual(dashboard)
    expect(collapsed[2]).toEqual(item12)
    expect(collapsed[3]).toEqual(review)

    const ellipsis = collapsed[1]
    expect(ellipsis).toMatchObject({ label: "…", isEllipsis: true })
    expect("collapsedItems" in ellipsis && ellipsis.collapsedItems).toEqual([events, q3, disputes])
  })
})
