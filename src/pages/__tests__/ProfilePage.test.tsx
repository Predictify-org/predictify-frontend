import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import ProfilePage from "../ProfilePage"

const handleSubmit = jest.fn((e: React.FormEvent) => e.preventDefault())

jest.mock("@/app/(dashboard)/profile/page", () => ({
  __esModule: true,
  default: () => (
    <form onSubmit={(e: React.FormEvent) => handleSubmit(e)}>
      <button type="submit">Save Changes</button>
    </form>
  ),
}))

jest.mock("../../components/Skeleton", () => ({
  ProfilePageSkeleton: () => <div data-testid="mock-skeleton" />,
}))

describe("ProfilePage keyboard shortcut hint", () => {
  beforeEach(() => {
    handleSubmit.mockClear()
  })

  it("renders a visible hint chip for the save shortcut", () => {
    render(<ProfilePage />)
    expect(screen.getByText("Ctrl/⌘+S")).toBeInTheDocument()
  })

  it("provides a screen-reader description of the shortcut", () => {
    render(<ProfilePage />)
    expect(
      screen.getByText(/press control\+s, or command\+s on mac/i),
    ).toBeInTheDocument()
  })

  it("submits the page's form on Ctrl+S", async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await user.keyboard("{Control>}s{/Control}")
    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it("submits the page's form on Cmd+S", async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await user.keyboard("{Meta>}s{/Meta}")
    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it("does not submit on an unrelated keypress", async () => {
    const user = userEvent.setup()
    render(<ProfilePage />)

    await user.keyboard("s")
    expect(handleSubmit).not.toHaveBeenCalled()
  })
})
