import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "../Tooltip";

/**
 * Mock matchMedia for Radix UI animations
 */
function mockMatchMedia() {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

describe("Tooltip", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockMatchMedia();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("rendering", () => {
    it("renders trigger without tooltip initially", () => {
      render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      expect(screen.getByRole("button", { name: "Hover me" })).toBeInTheDocument();
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("renders the trigger element as-is when not disabled", () => {
      render(
        <Tooltip content="Help text">
          <button data-testid="trigger">Click</button>
        </Tooltip>
      );

      expect(screen.getByTestId("trigger")).toBeInTheDocument();
    });
  });

  describe("hover delay", () => {
    it("shows tooltip after hover delay", async () => {
      render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Create a mouse pointer event
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" })
        );
      });

      // Advance time by delay - 1ms, tooltip should not appear yet
      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      // Advance by 1ms more (total 300ms), tooltip should appear
      act(() => {
        jest.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
        expect(screen.getByRole("tooltip")).toHaveTextContent("Help text");
      });
    });

    it("dismisses on mouse leave before delay fires", async () => {
      render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Start hover
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" })
        );
      });

      // Advance time partway through delay
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Mouse leave before delay completes
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse" })
        );
      });

      // Advance past original delay
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Tooltip should never appear
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("uses custom delay when provided", async () => {
      render(
        <Tooltip content="Help text" delay={500}>
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" })
        );
      });

      // Tooltip should not appear before custom delay
      act(() => {
        jest.advanceTimersByTime(499);
      });
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      // Should appear after custom delay
      act(() => {
        jest.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });

    it("hides tooltip when pointer leaves after it appears", async () => {
      render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Show tooltip
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" })
        );
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      // Leave
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse" })
        );
      });

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });
  });

  describe("keyboard support", () => {
    it("shows on focus, dismisses on blur", async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <Tooltip content="Help text">
          <button>Focus me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Focus the trigger
      await user.tab();
      expect(trigger).toHaveFocus();

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      // Blur by tabbing away
      await user.tab();

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });

    it("dismisses on Escape key", async () => {
      render(
        <Tooltip content="Help text">
          <button>Focus me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Focus to show tooltip
      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      // Press Escape
      act(() => {
        const escapeEvent = new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
        });
        document.dispatchEvent(escapeEvent);
      });

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });

    it("does not trap focus", async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <div>
          <Tooltip content="Help text">
            <button>First</button>
          </Tooltip>
          <button>Second</button>
        </div>
      );

      const firstButton = screen.getByRole("button", { name: "First" });
      const secondButton = screen.getByRole("button", { name: "Second" });

      // Focus first button (shows tooltip)
      await user.tab();
      expect(firstButton).toHaveFocus();

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      // Tab to second button
      await user.tab();
      expect(secondButton).toHaveFocus();

      // Tooltip should be dismissed and focus moved successfully
      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });
  });

  describe("long-press support", () => {
    it("shows tooltip after long-press on touch", async () => {
      render(
        <Tooltip content="Help text">
          <button>Touch me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Simulate touch start (long-press)
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })
        );
      });

      // Advance time by long-press duration - 1ms
      act(() => {
        jest.advanceTimersByTime(599);
      });
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      // Advance by 1ms more (total 600ms)
      act(() => {
        jest.advanceTimersByTime(1);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });

    it("dismisses tooltip on touch end", async () => {
      render(
        <Tooltip content="Help text">
          <button>Touch me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Long-press to show tooltip
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })
        );
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      // Touch end
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" })
        );
      });

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });

    it("cancels long-press if touch ends before duration", async () => {
      render(
        <Tooltip content="Help text">
          <button>Touch me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Start touch
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })
        );
      });

      // Advance time partway
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // End touch early
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerup", { bubbles: true, pointerType: "touch" })
        );
      });

      // Advance past original duration
      act(() => {
        jest.advanceTimersByTime(400);
      });

      // Tooltip should never appear
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("does not trigger long-press on mouse pointer down", async () => {
      render(
        <Tooltip content="Help text">
          <button>Click me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Mouse pointer down (not touch)
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" })
        );
        jest.advanceTimersByTime(600);
      });

      // Should not show tooltip via long-press for mouse
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("ARIA attributes", () => {
    it("tooltip has role='tooltip'", async () => {
      render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Show tooltip
      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toBeInTheDocument();
      });
    });

    it("trigger has aria-describedby linking to tooltip", async () => {
      render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Show tooltip
      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        const describedBy = trigger.getAttribute("aria-describedby");
        expect(describedBy).toBeTruthy();
        expect(tooltip.id).toBe(describedBy);
      });
    });

    it("tooltip is hidden from assistive technology when not visible", () => {
      render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      // Tooltip should not be in the accessibility tree when hidden
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("disabled prop", () => {
    it("does not show tooltip when disabled is true", async () => {
      render(
        <Tooltip content="Help text" disabled>
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Try to show via hover
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" })
        );
        jest.advanceTimersByTime(300);
      });

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      // Try to show via focus
      act(() => {
        trigger.focus();
      });

      await waitFor(
        () => {
          expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
        },
        { timeout: 100 }
      );
    });

    it("renders trigger normally when disabled", () => {
      render(
        <Tooltip content="Help text" disabled>
          <button data-testid="trigger">Click</button>
        </Tooltip>
      );

      expect(screen.getByTestId("trigger")).toBeInTheDocument();
    });
  });

  describe("placement", () => {
    it("renders with default top placement", async () => {
      render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toBeInTheDocument();
        // Radix UI sets data-side attribute
        expect(tooltip).toHaveAttribute("data-side", "top");
      });
    });

    it("renders with bottom placement when specified", async () => {
      render(
        <Tooltip content="Help text" placement="bottom">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveAttribute("data-side", "bottom");
      });
    });

    it("renders with left placement when specified", async () => {
      render(
        <Tooltip content="Help text" placement="left">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveAttribute("data-side", "left");
      });
    });

    it("renders with right placement when specified", async () => {
      render(
        <Tooltip content="Help text" placement="right">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip).toHaveAttribute("data-side", "right");
      });
    });
  });

  describe("cleanup", () => {
    it("clears timers on unmount", () => {
      const { unmount } = render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Start hover (creates timer)
      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" })
        );
      });

      // Get pending timers count
      const timersBefore = jest.getTimerCount();
      expect(timersBefore).toBeGreaterThan(0);

      // Unmount
      unmount();

      // Run cleanup
      act(() => {
        jest.runOnlyPendingTimers();
      });

      // Timers should be cleared (no errors thrown)
      expect(() => jest.runAllTimers()).not.toThrow();
    });

    it("does not leave orphan DOM nodes after unmount", () => {
      const { unmount } = render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // Show tooltip
      act(() => {
        trigger.focus();
      });

      // Unmount
      unmount();

      // Tooltip should not exist in DOM
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("content variations", () => {
    it("renders string content", async () => {
      render(
        <Tooltip content="Simple text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toHaveTextContent("Simple text");
      });
    });

    it("renders rich content (React nodes)", async () => {
      render(
        <Tooltip
          content={
            <div>
              <strong>Bold</strong> and <em>italic</em>
            </div>
          }
        >
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        expect(tooltip.querySelector("strong")).toHaveTextContent("Bold");
        expect(tooltip.querySelector("em")).toHaveTextContent("italic");
      });
    });
  });

  describe("dark mode", () => {
    it("renders without hardcoded colors", async () => {
      render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        const tooltip = screen.getByRole("tooltip");
        // Check that design tokens are used (bg-popover, text-popover-foreground)
        expect(tooltip).toHaveClass("bg-popover");
        expect(tooltip).toHaveClass("text-popover-foreground");
        // Should not have hardcoded color classes like bg-white or text-black
        expect(tooltip.className).not.toMatch(/bg-white|bg-black|text-white|text-black/);
      });
    });
  });

  describe("vacuousness checks", () => {
    it("test for hover delay actually validates the delay logic", async () => {
      // This test verifies that removing the delay logic would cause test failure
      render(
        <Tooltip content="Help text">
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      act(() => {
        trigger.dispatchEvent(
          new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" })
        );
      });

      // Without advancing timers, tooltip should NOT appear
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      // Only after advancing should it appear
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });
    });

    it("test for disabled prop actually validates the disabled logic", async () => {
      const { rerender } = render(
        <Tooltip content="Help text" disabled={false}>
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole("button");

      // When not disabled, tooltip should appear
      act(() => {
        trigger.focus();
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
      });

      // Clean up
      act(() => {
        trigger.blur();
      });

      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });

      // Rerender with disabled
      rerender(
        <Tooltip content="Help text" disabled>
          <button>Hover me</button>
        </Tooltip>
      );

      // When disabled, tooltip should NOT appear
      const triggerAfter = screen.getByRole("button");
      act(() => {
        triggerAfter.focus();
      });

      await waitFor(
        () => {
          expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
        },
        { timeout: 100 }
      );
    });
  });
});
