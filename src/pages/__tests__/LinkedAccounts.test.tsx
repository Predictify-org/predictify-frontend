import React from "react"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import LinkedAccounts from "../LinkedAccounts"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockAddress: string | null = "GCFYSE...9LQ2"
let mockName: string | null = "Freighter"
let mockConnected: boolean = true
let mockDisconnect: jest.Mock
let mockConnectWallet: jest.Mock
let mockIsConnecting: boolean = false
let mockBalance: string | null = "125.5000000"
let mockBalanceLoading: boolean = false

jest.mock("@/context/WalletContext", () => ({
  useWalletContext: () => ({
    address: mockAddress,
    name: mockName,
    connected: mockConnected,
  }),
}))

jest.mock("@/hooks/useWallet.hook", () => ({
  useWallet: () => ({
    disconnectWallet: mockDisconnect,
    connectWallet: mockConnectWallet,
    isConnecting: mockIsConnecting,
  }),
}))

jest.mock("@/hooks/useStellarBalance.hook", () => ({
  useStellarBalance: () => ({
    balance: mockBalance,
    isLoading: mockBalanceLoading,
  }),
}))

jest.mock("@/lib/config", () => ({
  getClientConfig: () => ({
    stellar: { network: "testnet" },
  }),
}))

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt ?? ""} {...props} />
  ),
}))

beforeEach(() => {
  mockAddress = "GCFYSEABCD123456789012345678901234567890GCFYSEABCD123456789012345678901234567890"
  mockName = "Freighter"
  mockConnected = true
  mockDisconnect = jest.fn()
  mockConnectWallet = jest.fn()
  mockIsConnecting = false
  mockBalance = "125.5000000"
  mockBalanceLoading = false
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LinkedAccounts", () => {
  it("renders the page heading", () => {
    render(<LinkedAccounts />)

    expect(
      screen.getByRole("heading", { level: 1, name: /linked accounts/i }),
    ).toBeInTheDocument()
  })

  it("shows connected wallet info when connected", () => {
    render(<LinkedAccounts />)

    // "Freighter" appears in wallet card AND sticky toolbar
    expect(screen.getAllByText("Freighter").length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText("Connected")).toBeInTheDocument()
  })

  it("shows wallet balance when connected", () => {
    render(<LinkedAccounts />)

    expect(screen.getByText("Native Balance")).toBeInTheDocument()
    expect(screen.getByText(/125\.5/)).toBeInTheDocument()
    expect(screen.getByText(/XLM/)).toBeInTheDocument()
  })

  it("shows copy address button in wallet card", () => {
    render(<LinkedAccounts />)

    // The wallet card copy button has the truncated address but NOT "in toolbar"
    const buttons = screen.getAllByRole("button", { name: /copy address/i })
    expect(buttons.length).toBeGreaterThanOrEqual(1)
    expect(buttons.some(btn => !btn.getAttribute("aria-label")?.includes("in toolbar"))).toBe(true)
  })

  it("shows disconnect button in wallet card", () => {
    render(<LinkedAccounts />)

    expect(
      screen.getByRole("button", { name: /disconnect freighter wallet from card/i }),
    ).toBeInTheDocument()
  })

  it("shows 'not connected' state when no wallet is connected", () => {
    mockConnected = false
    mockAddress = null
    mockName = null
    render(<LinkedAccounts />)

    // "No wallet connected" appears in empty state card AND sticky toolbar
    expect(
      screen.getAllByText(/no wallet connected/i).length,
    ).toBeGreaterThanOrEqual(1)
  })

  it("calls disconnectWallet when disconnect is clicked", async () => {
    const user = userEvent.setup()
    render(<LinkedAccounts />)

    await user.click(screen.getByRole("button", { name: /disconnect freighter wallet from card/i }))
    expect(mockDisconnect).toHaveBeenCalledTimes(1)
  })

  describe("available wallets section", () => {
    it("renders available wallets when connected (excluding current)", () => {
      render(<LinkedAccounts />)

      // Freighter is connected, so it should NOT appear in available wallets
      expect(screen.queryByRole("button", { name: /connect freighter wallet from available list/i })).not.toBeInTheDocument()
      // LOBSTR, XBULL, Albedo, Rabet should appear
      expect(screen.getByRole("button", { name: /connect lobstr wallet from available list/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /connect xbull wallet from available list/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /connect albedo wallet from available list/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /connect rabet wallet from available list/i })).toBeInTheDocument()
    })

    it("renders all wallets when not connected", () => {
      mockConnected = false
      mockAddress = null
      mockName = null
      render(<LinkedAccounts />)

      // Available wallets list buttons
      expect(screen.getByRole("button", { name: /connect freighter wallet from available list/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /connect lobstr wallet from available list/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /connect xbull wallet from available list/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /connect albedo wallet from available list/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /connect rabet wallet from available list/i })).toBeInTheDocument()
    })

    it("calls connectWallet with correct id when a wallet is clicked", async () => {
      const user = userEvent.setup()
      render(<LinkedAccounts />)

      await user.click(screen.getByRole("button", { name: /connect lobstr wallet from available list/i }))
      expect(mockConnectWallet).toHaveBeenCalledWith("lobstr")
    })
  })

  describe("sticky bottom action bar", () => {
    it("renders the toolbar", () => {
      render(<LinkedAccounts />)

      const toolbar = screen.getByRole("toolbar", { name: /wallet actions/i })
      expect(toolbar).toBeInTheDocument()
    })

    it("starts hidden before scrolling", () => {
      render(<LinkedAccounts />)

      const toolbar = screen.getByRole("toolbar", { name: /wallet actions/i })
      expect(toolbar.className).toContain("translate-y-full")
    })

    it("appears after scrolling past the header", () => {
      render(<LinkedAccounts />)

      const toolbar = screen.getByRole("toolbar", { name: /wallet actions/i })
      const headerEl = screen.getByTestId("linked-accounts-header")

      const origGetBoundingClientRect = headerEl.getBoundingClientRect.bind(headerEl)
      jest.spyOn(headerEl, "getBoundingClientRect").mockReturnValue({
        bottom: -100,
        top: -200,
        left: 0,
        right: 0,
        width: 0,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => null,
      } as DOMRect)

      act(() => {
        window.dispatchEvent(new Event("scroll", { bubbles: true }))
      })

      expect(toolbar.className).toContain("translate-y-0")
      expect(toolbar.className).not.toContain("translate-y-full")

      headerEl.getBoundingClientRect = origGetBoundingClientRect
    })

    it("shows wallet name and action buttons when connected", () => {
      render(<LinkedAccounts />)

      const toolbar = screen.getByRole("toolbar", { name: /wallet actions/i })
      expect(within(toolbar).getByText("Freighter")).toBeInTheDocument()
      expect(
        within(toolbar).getByRole("button", { name: /copy/i }),
      ).toBeInTheDocument()
      expect(
        within(toolbar).getByRole("button", { name: /disconnect/i }),
      ).toBeInTheDocument()
    })

    it("shows connect button in toolbar when not connected", () => {
      mockConnected = false
      mockAddress = null
      mockName = null
      render(<LinkedAccounts />)

      const toolbar = screen.getByRole("toolbar", { name: /wallet actions/i })
      expect(
        within(toolbar).getByRole("button", { name: /connect/i }),
      ).toBeInTheDocument()
    })

    it("calls disconnectWallet from toolbar disconnect button", async () => {
      const user = userEvent.setup()
      render(<LinkedAccounts />)

      const toolbar = screen.getByRole("toolbar", { name: /wallet actions/i })
      await user.click(
        within(toolbar).getByRole("button", { name: /disconnect/i }),
      )
      expect(mockDisconnect).toHaveBeenCalledTimes(1)
    })
  })

  describe("accessibility", () => {
    it("renders an aria-live region for wallet status", () => {
      render(<LinkedAccounts />)

      const liveRegion = screen.getByRole("status")
      expect(liveRegion).toHaveAttribute("aria-live", "polite")
    })

    it("announces connected status in live region", async () => {
      render(<LinkedAccounts />)

      const liveRegion = screen.getByRole("status")
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/connected to freighter/i)
      })
    })

    it("announces disconnected status when not connected", async () => {
      mockConnected = false
      mockAddress = null
      mockName = null
      render(<LinkedAccounts />)

      const liveRegion = screen.getByRole("status")
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/no wallet connected/i)
      })
    })

    it("provides accessible labels for wallet connect buttons", () => {
      render(<LinkedAccounts />)

      expect(
        screen.getByRole("button", { name: /connect lobstr wallet from available list/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /connect xbull wallet from available list/i }),
      ).toBeInTheDocument()
    })
  })
})
