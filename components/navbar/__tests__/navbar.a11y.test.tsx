import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ── Mock Next.js navigation ────────────────────────────────────────────────
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/markets"),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}))

// ── Mock next-themes ──────────────────────────────────────────────────────
jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({ theme: "dark", setTheme: jest.fn() })),
}))

// ── Mock WalletContext ────────────────────────────────────────────────────
jest.mock("@/context/WalletContext", () => ({
  useWalletContext: jest.fn(() => ({ connected: false, isLoading: false })),
}))

// ── Mock ConnectWalletModal so it renders nothing ─────────────────────────
jest.mock("@/components/connect-wallet-modal", () => ({
  ConnectWalletModal: () => null,
}))

// ── Mock NetworkSwitcher / WalletMenu / ConnectWalletAction ───────────────
jest.mock("../NetworkSwitcher", () => ({
  NetworkSwitcher: () => <div data-testid="network-switcher" />,
}))
jest.mock("../WalletMenu", () => ({
  WalletMenu: () => <div data-testid="wallet-menu" />,
}))
jest.mock("../ConnectWalletAction", () => ({
  ConnectWalletAction: () => <div data-testid="connect-wallet-action" />,
}))

import { Navbar } from "../Navbar"
import MobileDrawer from "../MobileDrawer"
import { SearchInput } from "../SearchInput"

// ── Mock events store for SearchInput ─────────────────────────────────────
jest.mock("@/lib/events-store", () => ({
  useEventsStore: jest.fn((selector) =>
    selector({
      events: [
        {
          id: "1",
          title: "Who wins the World Cup?",
          category: "Football",
          odds: 60,
        },
      ],
    })
  ),
}))

// ── Mock Radix Dialog (Sheet) internals ───────────────────────────────────
// Radix uses portals; keep them in the document for queries
jest.mock("@radix-ui/react-dialog", () => {
  const actual = jest.requireActual("@radix-ui/react-dialog")
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Navbar tests
// ─────────────────────────────────────────────────────────────────────────────
describe("Navbar — accessibility", () => {
  it("renders the desktop search input with an accessible label", () => {
    render(<Navbar />)
    const searchInput = screen.getByRole("searchbox", { name: /search markets/i })
    expect(searchInput).toBeInTheDocument()
  })

  it("renders the theme toggle with a descriptive aria-label", () => {
    render(<Navbar />)
    const themeBtn = screen.getByRole("button", { name: /switch to (light|dark) mode/i })
    expect(themeBtn).toBeInTheDocument()
  })

  it("renders the Connect Wallet button with visible text", () => {
    render(<Navbar />)
    // Both desktop and mobile render connect-wallet buttons
    const connectBtns = screen.getAllByRole("button", { name: /connect wallet/i })
    expect(connectBtns.length).toBeGreaterThan(0)
  })

  it("shows aria-busy on the loading button when wallet is connecting", () => {
    const { useWalletContext } = require("@/context/WalletContext")
    useWalletContext.mockReturnValue({ connected: false, isLoading: true })
    render(<Navbar />)
    const loadingBtns = screen.getAllByRole("button", { name: /connecting wallet/i })
    loadingBtns.forEach((btn) => {
      expect(btn).toHaveAttribute("aria-busy", "true")
      expect(btn).toBeDisabled()
    })
  })

  it("mobile bottom nav links expose aria-current='page' for active route", () => {
    render(<Navbar />)
    const activeLinks = screen.getAllByRole("link", { current: "page" })
    // /markets is the active path
    expect(activeLinks.length).toBeGreaterThan(0)
  })

  it("mobile bottom nav has an aria-label on the nav landmark", () => {
    render(<Navbar />)
    const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i })
    expect(mobileNav).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MobileDrawer tests
// ─────────────────────────────────────────────────────────────────────────────
describe("MobileDrawer — accessibility", () => {
  const links = [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
  ]

  it("renders as a dialog role when open", () => {
    render(
      <MobileDrawer open onOpenChange={jest.fn()} links={links} />
    )
    // Radix Dialog sets role="dialog" and aria-modal; we assert the role is present.
    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()
  })

  it("does not render dialog content when closed", () => {
    render(
      <MobileDrawer open={false} onOpenChange={jest.fn()} links={links} />
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("has an accessible close button", () => {
    render(
      <MobileDrawer open onOpenChange={jest.fn()} links={links} />
    )
    const closeBtn = screen.getByRole("button", { name: /close menu/i })
    expect(closeBtn).toBeInTheDocument()
  })

  it("calls onOpenChange(false) when close button is clicked", async () => {
    const onOpenChange = jest.fn()
    render(
      <MobileDrawer open onOpenChange={onOpenChange} links={links} />
    )
    const closeBtn = screen.getByRole("button", { name: /close menu/i })
    await userEvent.click(closeBtn)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("nav links are keyboard-accessible and have visible text", () => {
    render(
      <MobileDrawer open onOpenChange={jest.fn()} links={links} />
    )
    for (const link of links) {
      expect(screen.getByRole("link", { name: link.label })).toBeInTheDocument()
    }
  })

  it("Connect Wallet button has visible label text", () => {
    render(
      <MobileDrawer open onOpenChange={jest.fn()} links={links} />
    )
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SearchInput tests
// ─────────────────────────────────────────────────────────────────────────────
describe("SearchInput — accessibility", () => {
  it("renders with combobox role", () => {
    render(<SearchInput />)
    const input = screen.getByRole("combobox")
    expect(input).toBeInTheDocument()
  })

  it("has aria-expanded=false when closed", () => {
    render(<SearchInput />)
    const input = screen.getByRole("combobox")
    expect(input).toHaveAttribute("aria-expanded", "false")
  })

  it("opens listbox on typing and sets aria-expanded=true", async () => {
    render(<SearchInput />)
    const input = screen.getByRole("combobox")
    await userEvent.type(input, "World")
    await waitFor(() => {
      expect(input).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })
  })

  it("suggestion options have role=option and aria-selected", async () => {
    render(<SearchInput />)
    const input = screen.getByRole("combobox")
    await userEvent.type(input, "World")
    await waitFor(() => {
      const options = screen.getAllByRole("option")
      expect(options.length).toBeGreaterThan(0)
      options.forEach((opt) => {
        expect(opt).toHaveAttribute("aria-selected")
      })
    })
  })

  it("updates aria-activedescendant when ArrowDown is pressed", async () => {
    render(<SearchInput />)
    const input = screen.getByRole("combobox")
    await userEvent.type(input, "World")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => {
      const activeId = input.getAttribute("aria-activedescendant")
      expect(activeId).toBeTruthy()
      expect(document.getElementById(activeId!)).toBeInTheDocument()
    })
  })

  it("closes listbox on Escape", async () => {
    render(<SearchInput />)
    const input = screen.getByRole("combobox")
    await userEvent.type(input, "World")
    await waitFor(() => screen.getByRole("listbox"))
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })

  it("input has an accessible label via aria-label", () => {
    render(<SearchInput placeholder="Search for something" />)
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-label",
      "Search for something"
    )
  })
})
