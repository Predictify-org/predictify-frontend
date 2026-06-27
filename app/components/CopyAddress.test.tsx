import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CopyAddress } from "./CopyAddress";

describe("CopyAddress", () => {
  const mockAddress = "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3JKAKZK7G";
  const mockShortAddress = "ABC123";

  beforeEach(() => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders truncated address with copy button by default", () => {
      render(<CopyAddress value={mockAddress} />);
      
      const truncatedText = screen.getByText(/GAHJJJ\.\.\.K7G/);
      const copyButton = screen.getByRole("button", { name: /copy to clipboard/i });
      
      expect(truncatedText).toBeInTheDocument();
      expect(copyButton).toBeInTheDocument();
    });

    it("renders full address when it's too short to truncate", () => {
      render(<CopyAddress value={mockShortAddress} />);
      
      const fullText = screen.getByText(mockShortAddress);
      expect(fullText).toBeInTheDocument();
    });

    it("respects custom truncateChars prop", () => {
      render(<CopyAddress value={mockAddress} truncateChars={4} />);
      
      const truncatedText = screen.getByText(/GAHJ\.\.\.K7G/);
      expect(truncatedText).toBeInTheDocument();
    });

    it("hides copy button when showCopyButton is false", () => {
      render(<CopyAddress value={mockAddress} showCopyButton={false} />);
      
      const copyButton = screen.queryByRole("button", { name: /copy to clipboard/i });
      expect(copyButton).not.toBeInTheDocument();
    });

    it("renders only full address when printOnly is true", () => {
      render(<CopyAddress value={mockAddress} printOnly />);
      
      const fullText = screen.getByText(mockAddress);
      const copyButton = screen.queryByRole("button", { name: /copy to clipboard/i });
      
      expect(fullText).toBeInTheDocument();
      expect(copyButton).not.toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <CopyAddress value={mockAddress} className="custom-class" />
      );
      
      const wrapper = container.querySelector(".custom-class");
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe("Copy Functionality", () => {
    it("copies address to clipboard when button is clicked", async () => {
      render(<CopyAddress value={mockAddress} />);
      
      const copyButton = screen.getByRole("button", { name: /copy to clipboard/i });
      fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockAddress);
    });

    it("shows 'Copied' state after successful copy", async () => {
      render(<CopyAddress value={mockAddress} />);
      
      const copyButton = screen.getByRole("button", { name: /copy to clipboard/i });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(copyButton).toHaveTextContent("Copied");
      });
    });

    it("resets to 'Copy' state after 2 seconds", async () => {
      render(<CopyAddress value={mockAddress} />);
      
      const copyButton = screen.getByRole("button", { name: /copy to clipboard/i });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(copyButton).toHaveTextContent("Copied");
      });
      
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(copyButton).toHaveTextContent("Copy");
      });
    });

    it("handles clipboard errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(
        new Error("Clipboard error")
      );
      
      render(<CopyAddress value={mockAddress} />);
      
      const copyButton = screen.getByRole("button", { name: /copy to clipboard/i });
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to copy text: ",
          expect.any(Error)
        );
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA label on copy button", () => {
      render(<CopyAddress value={mockAddress} />);
      
      const copyButton = screen.getByRole("button", { name: "Copy to clipboard" });
      expect(copyButton).toBeInTheDocument();
    });

    it("uses aria-hidden for truncated address display", () => {
      const { container } = render(<CopyAddress value={mockAddress} />);
      
      const truncatedSpan = container.querySelector('[aria-hidden="true"]');
      expect(truncatedSpan).toBeInTheDocument();
    });

    it("includes print-only span for full address", () => {
      const { container } = render(<CopyAddress value={mockAddress} />);
      
      const printOnlySpan = container.querySelector(".print-only");
      expect(printOnlySpan).toBeInTheDocument();
      expect(printOnlySpan).toHaveTextContent(mockAddress);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty string", () => {
      render(<CopyAddress value="" />);
      
      const wrapper = screen.getByText("");
      expect(wrapper).toBeInTheDocument();
    });

    it("handles very long addresses", () => {
      const longAddress = "G" + "A".repeat(100);
      render(<CopyAddress value={longAddress} />);
      
      const truncatedText = screen.getByText(/GAAAAA\.\.\.AAAAA/);
      expect(truncatedText).toBeInTheDocument();
    });

    it("handles special characters in address", () => {
      const specialAddress = "GABC-123_TEST@xyz";
      render(<CopyAddress value={specialAddress} />);
      
      const fullText = screen.getByText(specialAddress);
      expect(fullText).toBeInTheDocument();
    });

    it("handles zero truncateChars", () => {
      render(<CopyAddress value={mockAddress} truncateChars={0} />);
      
      const fullText = screen.getByText(mockAddress);
      expect(fullText).toBeInTheDocument();
    });
  });
});
