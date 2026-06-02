import { render } from "@testing-library/react";
const { fireEvent, screen, waitFor } = require("@testing-library/react") as any;
import { useState } from "react";
import { Modal } from "./Modal";

function getOverlay(): HTMLElement {
  const overlay = document.body.querySelector('div[style*="position: fixed"]');
  if (!overlay) {
    throw new Error("Expected modal overlay to be present.");
  }
  return overlay as HTMLElement;
}

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open modal
      </button>
      <button type="button">Background action</button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm action"
      >
        <button type="button">Focusable action</button>
        <button type="button">Final action</button>
      </Modal>
    </div>
  );
}

describe("Modal", () => {
  it("opens and closes from user actions", () => {
    render(<ModalHarness />);

    fireEvent.click(screen.getByRole("button", { name: /open modal/i }));
    expect(screen.getByRole("heading", { name: /confirm action/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close modal/i }));
    fireEvent.animationEnd(getOverlay());
    expect(screen.queryByRole("heading", { name: /confirm action/i })).not.toBeInTheDocument();
  });

  it("closes when clicking backdrop", async () => {
    render(<ModalHarness />);

    fireEvent.click(screen.getByRole("button", { name: /open modal/i }));
    expect(screen.getByRole("heading", { name: /confirm action/i })).toBeInTheDocument();
    fireEvent.click(getOverlay());
    fireEvent.animationEnd(getOverlay());

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /confirm action/i })).not.toBeInTheDocument();
    });
  });

  it("renders children only while open", () => {
    render(<ModalHarness />);

    expect(screen.queryByText(/focusable action/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /open modal/i }));
    expect(screen.getByText(/focusable action/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close modal/i }));
    fireEvent.animationEnd(getOverlay());
    expect(screen.queryByText(/focusable action/i)).not.toBeInTheDocument();
  });

  it("renders as an accessible modal dialog labelled by its title", () => {
    render(<ModalHarness />);

    fireEvent.click(screen.getByRole("button", { name: /open modal/i }));

    const dialog = screen.getByRole("dialog", { name: /confirm action/i });
    const title = screen.getByRole("heading", { name: /confirm action/i });

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", title.id);
  });

  it("moves focus into the dialog and restores it to the trigger on close", () => {
    render(<ModalHarness />);

    const trigger = screen.getByRole("button", { name: /open modal/i });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: /confirm action/i });
    expect(dialog).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(trigger).toHaveFocus();
  });

  it("traps Tab and Shift+Tab focus inside the dialog", () => {
    render(<ModalHarness />);

    fireEvent.click(screen.getByRole("button", { name: /open modal/i }));

    const dialog = screen.getByRole("dialog", { name: /confirm action/i });
    const closeButton = screen.getByRole("button", { name: /close modal/i });
    const finalAction = screen.getByRole("button", { name: /final action/i });

    finalAction.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    closeButton.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(finalAction).toHaveFocus();
  });

  it("closes on Escape and locks body scroll while open", () => {
    render(<ModalHarness />);

    fireEvent.click(screen.getByRole("button", { name: /open modal/i }));

    const dialog = screen.getByRole("dialog", { name: /confirm action/i });
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(document.body.style.overflow).toBe("");
    fireEvent.animationEnd(getOverlay());

    expect(screen.queryByRole("dialog", { name: /confirm action/i })).not.toBeInTheDocument();
  });
});
