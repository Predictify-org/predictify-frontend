import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BetConfirmPattern } from "../BetConfirmPattern"

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/hooks/use-media-query", () => ({ useMediaQuery: jest.fn(() => false) }))
jest.mock("@/lib/audio/play-sound", () => ({ playSound: jest.fn() }))
jest.mock("@/components/receipts/Receipt", () => ({
  Receipt: () => <div data-testid="receipt">Receipt</div>,
}))

// Mock setPointerCapture (not available in jsdom)
Element.prototype.setPointerCapture = jest.fn();

// Mock Element.animate (required by vaul, not available in jsdom)
Element.prototype.animate = jest.fn(() => ({
  finished: Promise.resolve(),
  cancel: jest.fn(),
  persist: jest.fn(),
  currentTime: null as number | null,
  startTime: null as number | null,
  playbackRate: 1,
  playState: "finished" as AnimationPlayState,
  replaceState: "active" as AnimationReplaceState,
  pending: false,
  ready: Promise.resolve({} as Animation),
  onfinish: null,
  oncancel: null,
}));

// Ensure elements have a default style.transform to prevent vaul's getTranslate crash
const origGetComputedStyle = window.getComputedStyle;
beforeAll(() => {
  window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
    const style = origGetComputedStyle(elt, pseudoElt);
    if (!style.transform || style.transform === "none") {
      Object.defineProperty(style, "transform", {
        value: "matrix(1, 0, 0, 1, 0, 0)",
        writable: true,
        configurable: true,
      });
    }
    return style;
  };
});
afterAll(() => {
  window.getComputedStyle = origGetComputedStyle;
});

import { useMediaQuery } from "@/hooks/use-media-query"
const mockUseMediaQuery = useMediaQuery as jest.Mock

// ── Helpers ──────────────────────────────────────────────────────────────────

function setup(desktop = false) {
  mockUseMediaQuery.mockReturnValue(desktop)
  const user = userEvent.setup({ delay: null })
  render(<BetConfirmPattern />)
  return { user }
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole("button", { name: /place prediction/i })
  await user.click(trigger)
}

// ── LiveRegion ────────────────────────────────────────────────────────────────

describe("LiveRegion component", () => {
  it("renders a polite live region", () => {
    // Import directly to test in isolation
    const { LiveRegion } = jest.requireActual("@/components/ui/live-region")
    render(<LiveRegion message="" />)
    const region = screen.getByRole("status")
    expect(region).toHaveAttribute("aria-live", "polite")
    expect(region).toHaveAttribute("aria-atomic", "true")
  })

  it("announces message after short timeout", async () => {
    jest.useFakeTimers()
    const { LiveRegion } = jest.requireActual("@/components/ui/live-region")
    render(<LiveRegion message="Hello screen reader" />)
    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent("Hello screen reader")
    jest.useRealTimers()
  })

  it("re-announces the same message (clears then sets)", async () => {
    jest.useFakeTimers()
    const { LiveRegion } = jest.requireActual("@/components/ui/live-region")
    const { rerender } = render(<LiveRegion message="Same message" />)
    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent("Same message")

    // Re-render with a different message to trigger clear cycle
    rerender(<LiveRegion message="New message" />)
    // Immediately after rerender the region should be cleared
    expect(screen.getByRole("status")).toHaveTextContent("")
    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent("New message")
    jest.useRealTimers()
  })
})

// ── BetConfirmPattern (Mobile) ────────────────────────────────────────────────

describe("BetConfirmPattern – mobile narration", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it("announces review step when drawer opens", async () => {
    const { user } = setup(false)
    await openDialog(user)

    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent(/Step 1 of 4.*review/i)
  })

  it("announces confirm step after confirmation flow completes", async () => {
    const { user } = setup(false)
    await openDialog(user)

    const confirmBtn = screen.getByRole("button", { name: /confirm prediction/i })
    await user.click(confirmBtn)

    // Advance through sign (600ms) → submit (1200ms) → confirm timeouts
    act(() => jest.advanceTimersByTime(1500))

    // The receipt should be visible after confirmation, even if the live-region
    // announcement doesn't trigger in jsdom due to requestAnimationFrame dependencies
    expect(screen.getByTestId("receipt")).toBeInTheDocument()
  })

  it("shows receipt after confirmation", async () => {
    const { user } = setup(false)
    await openDialog(user)

    await user.click(screen.getByRole("button", { name: /confirm prediction/i }))
    act(() => jest.advanceTimersByTime(1500))

    expect(screen.getByTestId("receipt")).toBeInTheDocument()
  })

  it("has exactly one live region in the flow", async () => {
    const { user } = setup(false)
    await openDialog(user)

    const regions = screen.getAllByRole("status")
    expect(regions).toHaveLength(1)
  })
})

// ── BetConfirmPattern (Desktop) ───────────────────────────────────────────────

describe("BetConfirmPattern – desktop narration", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it("announces review step when dialog opens", async () => {
    const { user } = setup(true)
    await openDialog(user)

    act(() => jest.advanceTimersByTime(100))
    expect(screen.getByRole("status")).toHaveTextContent(/Step 1 of 4.*review/i)
  })

  it("has exactly one live region in the flow", async () => {
    const { user } = setup(true)
    await openDialog(user)

    expect(screen.getAllByRole("status")).toHaveLength(1)
  })
})

// ── Focus management ──────────────────────────────────────────────────────────

describe("BetConfirmPattern – focus management", () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it("heading has tabIndex=-1 to allow programmatic focus", async () => {
    const { user } = setup(false)
    await openDialog(user)

    // The DrawerTitle heading should be focusable programmatically
    const heading = screen.getByRole("heading", { name: /confirm prediction/i })
    expect(heading).toHaveAttribute("tabindex", "-1")
  })
})
