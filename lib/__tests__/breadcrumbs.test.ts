import { getBreadcrumbsForPath } from "../breadcrumbs"

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
