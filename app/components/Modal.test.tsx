import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm action"
      >
        <button type="button">Focusable action</button>
      </Modal>
    </div>
  );
}

describe("Modal", () => {
  it("opens and closes from user actions", () => {
    render(<ModalHarness />);

    fireEvent.click(screen.getByRole("button", { name: /open modal/i }));
    expect(screen.getByRole("heading", { name: /confirm action/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /×/i }));
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

    fireEvent.click(screen.getByRole("button", { name: /×/i }));
    fireEvent.animationEnd(getOverlay());
    expect(screen.queryByText(/focusable action/i)).not.toBeInTheDocument();
  });
});
