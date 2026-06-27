import { render, screen } from "@testing-library/react"

import NotFound from "../not-found"

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ priority, ...props }: any) => <img {...props} />,
}))

describe("NotFound", () => {
  it("renders recovery shortcuts", () => {
    render(<NotFound />)

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    )
    expect(screen.getByRole("link", { name: /markets/i })).toHaveAttribute(
      "href",
      "/events"
    )
    expect(screen.getByRole("link", { name: /help/i })).toHaveAttribute(
      "href",
      "/help"
    )
  })

  it("includes a mailto fallback for broken links", () => {
    render(<NotFound />)

    expect(
      screen.getByRole("link", { name: /report a broken link/i })
    ).toHaveAttribute(
      "href",
      "mailto:support@predictify.app?subject=Broken%20link%20report"
    )
  })
})
