import { render, screen } from "@testing-library/react"

import {
  ExternalLink,
  mergeExternalLinkRel,
} from "@/components/ExternalLink"

describe("ExternalLink", () => {
  it("opens in a new tab with safe rel tokens", () => {
    render(<ExternalLink href="https://docs.example.com">Docs</ExternalLink>)

    const link = screen.getByRole("link", {
      name: /docs opens in a new tab/i,
    })

    expect(link).toHaveAttribute("href", "https://docs.example.com")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("preserves existing rel values while adding noopener and noreferrer", () => {
    expect(mergeExternalLinkRel("nofollow noopener")).toBe(
      "nofollow noopener noreferrer"
    )
  })

  it("renders the external affordance icon by default", () => {
    render(<ExternalLink href="https://docs.example.com">Docs</ExternalLink>)

    expect(screen.getByTestId("external-link-icon")).toBeInTheDocument()
  })

  it("can hide the visible icon while keeping the screen-reader hint", () => {
    render(
      <ExternalLink href="https://docs.example.com" showIcon={false}>
        Docs
      </ExternalLink>
    )

    expect(
      screen.getByRole("link", { name: /docs opens in a new tab/i })
    ).toBeInTheDocument()
    expect(screen.queryByTestId("external-link-icon")).not.toBeInTheDocument()
  })
})
