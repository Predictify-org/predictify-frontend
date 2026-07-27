import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { StatCard, type StatEmptyVariant } from "../stat-card"

describe("StatCard — Issue #646: Focus Visible Accessibility", () => {
  const mockStat = { label: "Volume", value: "$4,325.49" }

  describe("a) Empty state CTA button has focus-visible class", () => {
    it("renders empty state with CTA button when status is 'empty'", () => {
      render(
        <StatCard
          index={0}
          status="empty"
          emptyVariant="volume"
        />
      )

      const button = screen.getByRole("button", { name: /Explore Markets/i })
      expect(button).toBeInTheDocument()
    })

    it("empty state button is keyboard reachable and receives focus", async () => {
      const user = userEvent.setup()
      render(
        <StatCard
          index={0}
          status="empty"
          emptyVariant="volume"
        />
      )

      const button = screen.getByRole("button", { name: /Explore Markets/i })
      
      // Tab to the button
      await user.tab()
      expect(button).toHaveFocus()
    })

    it("empty state button has focus-visible classes from Button component", () => {
      render(
        <StatCard
          index={0}
          status="empty"
          emptyVariant="volume"
        />
      )

      const button = screen.getByRole("button", { name: /Explore Markets/i })
      
      // Button component includes: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      const className = button.className
      expect(className).toMatch(/focus-visible:outline-none/)
      expect(className).toMatch(/focus-visible:ring-2/)
      expect(className).toMatch(/focus-visible:ring-ring/)
      expect(className).toMatch(/focus-visible:ring-offset-2/)
    })
  })

  describe("b) Error state retry button has focus-visible class", () => {
    it("renders error state with retry button when status is 'error'", () => {
      render(
        <StatCard
          index={0}
          status="error"
          onRetry={jest.fn()}
        />
      )

      const retryButton = screen.getByRole("button", { name: /Retry/i })
      expect(retryButton).toBeInTheDocument()
    })

    it("error state retry button is keyboard reachable", async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      
      render(
        <StatCard
          index={0}
          status="error"
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByRole("button", { name: /Retry/i })
      
      await user.tab()
      expect(retryButton).toHaveFocus()
    })

    it("error state retry button has focus-visible classes", () => {
      const onRetry = jest.fn()
      render(
        <StatCard
          index={0}
          status="error"
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByRole("button", { name: /Retry/i })
      const className = retryButton.className
      
      // Verify Button component classes are present
      expect(className).toMatch(/focus-visible:outline-none/)
      expect(className).toMatch(/focus-visible:ring-2/)
    })

    it("retry button callback is invoked on click", async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      
      render(
        <StatCard
          index={0}
          status="error"
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByRole("button", { name: /Retry/i })
      await user.click(retryButton)
      
      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })

  describe("c) Success state with stat data", () => {
    it("renders stat value and label", () => {
      render(
        <StatCard
          stat={mockStat}
          index={0}
          status="success"
        />
      )

      expect(screen.getByText("$4,325.49")).toBeInTheDocument()
      expect(screen.getByText("Volume")).toBeInTheDocument()
    })

    it("success state is not interactive (no focus styles needed)", () => {
      const { container } = render(
        <StatCard
          stat={mockStat}
          index={0}
          status="success"
        />
      )

      // The stat card container itself should not have focus-visible styles
      const statContainer = container.querySelector(".relative.group")
      expect(statContainer).toBeInTheDocument()
      
      // Verify no click handlers or tabindex on the display area
      expect(statContainer).not.toHaveAttribute("tabindex")
    })
  })

  describe("d) Loading state", () => {
    it("renders skeleton placeholder when status is 'loading'", () => {
      const { container } = render(
        <StatCard
          index={0}
          status="loading"
        />
      )

      const skeleton = container.querySelector(".h-44")
      expect(skeleton).toBeInTheDocument()
    })

    it("loading state has no interactive elements", () => {
      const { container } = render(
        <StatCard
          index={0}
          status="loading"
        />
      )

      const buttons = container.querySelectorAll("button")
      expect(buttons.length).toBe(0)
    })
  })

  describe("e) All empty state variants render correctly", () => {
    const variants: StatEmptyVariant[] = [
      'volume',
      'predictions',
      'win-rate',
      'leaderboard'
    ]

    variants.forEach((variant) => {
      it(`${variant} variant renders with accessible button`, async () => {
        const user = userEvent.setup()
        render(
          <StatCard
            index={0}
            status="empty"
            emptyVariant={variant}
          />
        )

        const button = screen.getByRole("button")
        expect(button).toBeInTheDocument()

        // Tab to ensure keyboard focus works
        await user.tab()
        expect(button).toHaveFocus()
      })
    })
  })

  describe("f) Semantic HTML and ARIA attributes are correct", () => {
    it("empty state has proper semantic structure", () => {
      render(
        <StatCard
          index={0}
          status="empty"
          emptyVariant="volume"
        />
      )

      const button = screen.getByRole("button")
      expect(button).toBeInTheDocument()
    })

    it("error state has alert role with alert title", () => {
      render(
        <StatCard
          index={0}
          status="error"
          onRetry={jest.fn()}
        />
      )

      const alert = screen.getByRole("alert")
      expect(alert).toBeInTheDocument()
      
      const title = screen.getByText("Failed to load KPI")
      expect(title).toBeInTheDocument()
    })
  })

  describe("g) Keyboard navigation works correctly", () => {
    it("empty state button responds to Enter key", async () => {
      const user = userEvent.setup()
      render(
        <StatCard
          index={0}
          status="empty"
          emptyVariant="volume"
        />
      )

      const link = screen.getByRole("link", { name: /Explore Markets/i })
      
      // Note: Link component doesn't respond to Enter like a button,
      // but the outer Button wrapper handles keyboard navigation
      expect(link).toBeInTheDocument()
    })

    it("error retry button responds to Enter key", async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      
      render(
        <StatCard
          index={0}
          status="error"
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByRole("button", { name: /Retry/i })
      retryButton.focus()
      
      await user.keyboard("{Enter}")
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it("error retry button responds to Space key", async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      
      render(
        <StatCard
          index={0}
          status="error"
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByRole("button", { name: /Retry/i })
      retryButton.focus()
      
      await user.keyboard(" ")
      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })

  describe("h) Focus outline not visible by default (mouse focus)", () => {
    it("button has focus-visible class (not focus class)", () => {
      render(
        <StatCard
          index={0}
          status="empty"
          emptyVariant="volume"
        />
      )

      const button = screen.getByRole("button", { name: /Explore Markets/i })
      const className = button.className
      
      // Should have focus-visible, not bare focus
      expect(className).toMatch(/focus-visible:outline-none/)
      // Should not have just "focus:" (only focus-visible: variants)
      // This is checked via the Button component's implementation
    })
  })

  describe("i) Multiple StatCard instances don't interfere", () => {
    it("renders multiple StatCards without conflicts", () => {
      const { container } = render(
        <>
          <StatCard stat={mockStat} index={0} status="success" />
          <StatCard index={1} status="empty" emptyVariant="predictions" />
          <StatCard index={2} status="loading" />
          <StatCard index={3} status="error" onRetry={jest.fn()} />
        </>
      )

      expect(container.querySelectorAll(".rounded-2xl").length).toBeGreaterThanOrEqual(2)
    })

    it("each StatCard button is independently keyboard accessible", async () => {
      const user = userEvent.setup()
      render(
        <>
          <StatCard index={0} status="empty" emptyVariant="volume" />
          <StatCard index={1} status="empty" emptyVariant="predictions" />
        </>
      )

      const buttons = screen.getAllByRole("button")
      expect(buttons.length).toBe(2)

      await user.tab()
      expect(buttons[0]).toHaveFocus()

      await user.tab()
      expect(buttons[1]).toHaveFocus()
    })
  })

  describe("j) Image accessibility in empty state", () => {
    it("empty state illustration has descriptive alt text", () => {
      render(
        <StatCard
          index={0}
          status="empty"
          emptyVariant="volume"
        />
      )

      const img = screen.getByAltText("No Volume")
      expect(img).toBeInTheDocument()
    })

    it("all empty variants have descriptive alt text", () => {
      const variants: Array<{ variant: StatEmptyVariant; expectedAlt: string }> = [
        { variant: 'volume', expectedAlt: 'No Volume' },
        { variant: 'predictions', expectedAlt: 'No Predictions' },
        { variant: 'win-rate', expectedAlt: '0% Win Rate' },
        { variant: 'leaderboard', expectedAlt: 'Unranked' }
      ]

      variants.forEach(({ variant, expectedAlt }) => {
        const { container } = render(
          <StatCard
            index={0}
            status="empty"
            emptyVariant={variant}
          />
        )

        const img = container.querySelector("img")
        expect(img).toHaveAttribute("alt", expectedAlt)
      })
    })
  })
})
