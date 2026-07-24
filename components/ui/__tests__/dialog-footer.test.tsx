/**
 * Tests for the canonical Confirm/Cancel button order in our primitive
 * `DialogFooter` and `AlertDialogFooter` (issue #474).
 *
 * The DOM order, the visual order, and keyboard focus order MUST all
 * match — see `docs/BUTTON_ORDER.md`.
 */
import * as React from "react";
import { describe, expect, it } from "@jest/globals";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Helper: returns all <button> elements that live inside the given
 * `role="alertdialog"` / `role="dialog"` node, in DOM (render) order.
 *
 * We use DOM order (not visual order — JSDOM has no layout engine) to
 * verify that the markup matches the spec; that, in turn, is what drives
 * keyboard Tab order and screen-reader announcement order.
 */
function getFooterButtons(
  dialog: HTMLElement,
  footerTestId: string,
): HTMLButtonElement[] {
  const footer = within(dialog).getByTestId(footerTestId);
  // Materialise the children in DOM order using `querySelectorAll`.
  return Array.from(
    footer.querySelectorAll<HTMLButtonElement>("button"),
  );
}

function AlertDialogHarness() {
  return (
    <AlertDialog defaultOpen>
      <AlertDialogTrigger asChild>
        <Button>Open</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this event?</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter data-testid="alert-footer">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700">
            Delete Event
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DialogHarness() {
  return (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Prediction</DialogTitle>
        </DialogHeader>
        <DialogFooter data-testid="dialog-footer">
          <Button variant="outline">Cancel</Button>
          <Button>Confirm Prediction</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Button order — Confirm/Cancel (issue #474)", () => {
  describe("AlertDialogFooter", () => {
    it("renders the Cancel-equivalent before the destructive Action", () => {
      render(<AlertDialogHarness />);

      const dialog = screen.getByRole("alertdialog");
      const buttons = getFooterButtons(dialog, "alert-footer");

      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveTextContent(/cancel/i);
      expect(buttons[1]).toHaveTextContent(/delete event/i);
    });

    it("focuses the Cancel-equivalent first when tabbing through the footer", async () => {
      const user = userEvent.setup();
      render(<AlertDialogHarness />);

      const dialog = screen.getByRole("alertdialog");
      const buttons = getFooterButtons(dialog, "alert-footer");

      // Focus the Cancel button directly — verifying the spec rule.
      buttons[0].focus();
      expect(document.activeElement).toBe(buttons[0]);

      // Tab forward once → next focusable inside the dialog must be the
      // destructive Action, NOT somewhere earlier in the document.
      await user.tab();
      expect(document.activeElement).toBe(buttons[1]);
    });

    it("does NOT use `flex-col-reverse` in the footer base classes", () => {
      render(<AlertDialogHarness />);

      const dialog = screen.getByRole("alertdialog");
      const footer = within(dialog).getByTestId("alert-footer");

      // `flex-col-reverse` would invert visual order vs DOM/tab order and
      // violate WCAG 2.4.3. We assert the absence of the className suffix.
      expect(footer.className).not.toMatch(/flex-col-reverse/);
      // The footer must still stack vertically on mobile.
      expect(footer.className).toMatch(/\bflex-col\b/);
      // And switch to a right-aligned row on `sm+`.
      expect(footer.className).toMatch(/sm:flex-row/);
      expect(footer.className).toMatch(/sm:justify-end/);
    });
  });

  describe("DialogFooter", () => {
    it("renders the Cancel equivalent before the primary action", () => {
      render(<DialogHarness />);

      const dialog = screen.getByRole("dialog");
      const buttons = getFooterButtons(dialog, "dialog-footer");

      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveTextContent(/cancel/i);
      expect(buttons[1]).toHaveTextContent(/confirm prediction/i);
    });

    it("focuses the Cancel first, then the primary action", async () => {
      const user = userEvent.setup();
      render(<DialogHarness />);

      const dialog = screen.getByRole("dialog");
      const buttons = getFooterButtons(dialog, "dialog-footer");

      buttons[0].focus();
      expect(document.activeElement).toBe(buttons[0]);

      await user.tab();
      expect(document.activeElement).toBe(buttons[1]);
    });

    it("does NOT use `flex-col-reverse` in the footer base classes", () => {
      render(<DialogHarness />);

      const dialog = screen.getByRole("dialog");
      const footer = within(dialog).getByTestId("dialog-footer");

      expect(footer.className).not.toMatch(/flex-col-reverse/);
      expect(footer.className).toMatch(/\bflex-col\b/);
      expect(footer.className).toMatch(/sm:flex-row/);
      expect(footer.className).toMatch(/sm:justify-end/);
    });
  });
});
