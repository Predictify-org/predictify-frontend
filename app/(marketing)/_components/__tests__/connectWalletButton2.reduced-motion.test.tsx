import React from "react";
import { render, screen } from "@testing-library/react";
import ConnectWalletButton from "../connectWalletButton2";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePathname } from "next/navigation";

// Mock the useReducedMotion hook
jest.mock("@/hooks/useReducedMotion");
const mockUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

// Test props
const defaultProps = {
  isConnected: false,
  walletName: null,
  walletAddress: null,
  onConnectClick: jest.fn(),
  onOpenModal: jest.fn(),
};

const connectedProps = {
  isConnected: true,
  walletName: "Freighter",
  walletAddress: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
  onConnectClick: jest.fn(),
  onOpenModal: jest.fn(),
};

describe("ConnectWalletButton2 — reduced-motion implementation", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
    mockUsePathname.mockReset();
    jest.clearAllMocks();
  });

  // ---- Transition behavior on home page ----------------------------------

  describe("Home page styling (pathname === '/')", () => {
    beforeEach(() => {
      mockUsePathname.mockReturnValue("/");
    });

    it("applies transitions and scale effects when motion is enabled", () => {
      mockUseReducedMotion.mockReturnValue(false);
      render(<ConnectWalletButton {...defaultProps} />);

      const button = screen.getByRole("button");
      
      // Should have transition and hover scale classes
      expect(button).toHaveClass("transition-all");
      expect(button).toHaveClass("duration-200");
      expect(button).toHaveClass("hover:scale-105");
      expect(button).toHaveClass("active:scale-100");
    });

    it("removes transitions and scale effects when motion is reduced", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(<ConnectWalletButton {...defaultProps} />);

      const button = screen.getByRole("button");
      
      // Should NOT have transition or scale classes
      expect(button).not.toHaveClass("transition-all");
      expect(button).not.toHaveClass("duration-200");
      expect(button).not.toHaveClass("hover:scale-105");
      expect(button).not.toHaveClass("active:scale-100");
      
      // But should still have other styling
      expect(button).toHaveClass("bg-white");
      expect(button).toHaveClass("text-purple-600");
    });

    it("background overlay respects reduced motion preference", () => {
      mockUseReducedMotion.mockReturnValue(false);
      const { container: motionContainer, unmount } = render(
        <ConnectWalletButton {...defaultProps} />
      );
      
      const overlay = motionContainer.querySelector(".group-hover\\:opacity-100");
      expect(overlay).toHaveClass("transition-opacity");
      expect(overlay).toHaveClass("duration-200");
      
      unmount();

      mockUseReducedMotion.mockReturnValue(true);
      const { container: reducedContainer } = render(
        <ConnectWalletButton {...defaultProps} />
      );
      
      const reducedOverlay = reducedContainer.querySelector(".group-hover\\:opacity-100");
      expect(reducedOverlay).not.toHaveClass("transition-opacity");
      expect(reducedOverlay).not.toHaveClass("duration-200");
    });
  });

  // ---- Transition behavior on other pages --------------------------------

  describe("Non-home page styling (pathname !== '/')", () => {
    beforeEach(() => {
      mockUsePathname.mockReturnValue("/dashboard");
    });

    it("applies subtle transitions when motion is enabled", () => {
      mockUseReducedMotion.mockReturnValue(false);
      render(<ConnectWalletButton {...defaultProps} />);

      const button = screen.getByRole("button");
      
      expect(button).toHaveClass("transition-all");
      expect(button).toHaveClass("duration-300");
      expect(button).toHaveClass("hover:shadow-cyan-500/30");
    });

    it("removes transitions when motion is reduced", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(<ConnectWalletButton {...defaultProps} />);

      const button = screen.getByRole("button");
      
      expect(button).not.toHaveClass("transition-all");
      expect(button).not.toHaveClass("duration-300");
      
      // Hover classes may still be present (handled by CSS media query)
      // but transition classes should be removed
    });

    it("maintains visual styling without transitions", () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(<ConnectWalletButton {...defaultProps} />);

      const button = screen.getByRole("button");
      
      // Core styling should be preserved
      expect(button).toHaveClass("bg-gradient-to-br");
      expect(button).toHaveClass("from-cyan-500/20");
      expect(button).toHaveClass("text-cyan-400");
      expect(button).toHaveClass("border");
      expect(button).toHaveClass("border-cyan-500/30");
    });
  });

  // ---- Connected vs Disconnected states ----------------------------------

  it("handles connected state consistently across motion preferences", () => {
    mockUsePathname.mockReturnValue("/");
    
    // Test with motion enabled
    mockUseReducedMotion.mockReturnValue(false);
    const { unmount } = render(<ConnectWalletButton {...connectedProps} />);
    
    expect(screen.getByText(/Freighter:/)).toBeInTheDocument();
    expect(screen.getByText(/GDQP2K...4W37/)).toBeInTheDocument();
    
    unmount();

    // Test with motion reduced
    mockUseReducedMotion.mockReturnValue(true);
    render(<ConnectWalletButton {...connectedProps} />);
    
    expect(screen.getByText(/Freighter:/)).toBeInTheDocument();
    expect(screen.getByText(/GDQP2K...4W37/)).toBeInTheDocument();
  });

  it("button functionality remains unchanged in reduced motion", () => {
    mockUseReducedMotion.mockReturnValue(true);
    mockUsePathname.mockReturnValue("/");
    
    const onConnectClick = jest.fn();
    render(<ConnectWalletButton {...defaultProps} onConnectClick={onConnectClick} />);

    const button = screen.getByRole("button");
    button.click();
    
    expect(onConnectClick).toHaveBeenCalledTimes(1);
  });

  // ---- Accessibility preservation ----------------------------------------

  it("maintains identical accessibility attributes across motion modes", () => {
    mockUsePathname.mockReturnValue("/");
    
    // Capture attributes with motion enabled
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount } = render(
      <ConnectWalletButton {...defaultProps} />
    );
    
    const motionButton = motionContainer.querySelector("button")!;
    const motionAttributes = {
      role: motionButton.getAttribute("role"),
      type: motionButton.getAttribute("type"),
      tabIndex: motionButton.getAttribute("tabindex"),
      ariaLabel: motionButton.getAttribute("aria-label"),
    };
    
    unmount();

    // Capture attributes with motion reduced
    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(
      <ConnectWalletButton {...defaultProps} />
    );
    
    const reducedButton = reducedContainer.querySelector("button")!;
    const reducedAttributes = {
      role: reducedButton.getAttribute("role"),
      type: reducedButton.getAttribute("type"),
      tabIndex: reducedButton.getAttribute("tabindex"),
      ariaLabel: reducedButton.getAttribute("aria-label"),
    };

    expect(reducedAttributes).toEqual(motionAttributes);
  });

  it("preserves focus management in reduced motion mode", () => {
    mockUseReducedMotion.mockReturnValue(true);
    mockUsePathname.mockReturnValue("/");
    
    render(<ConnectWalletButton {...defaultProps} />);

    const button = screen.getByRole("button");
    
    // Button should be focusable
    button.focus();
    expect(document.activeElement).toBe(button);
    
    // Should have focus ring classes
    expect(button).toHaveClass("focus:outline-none");
    expect(button).toHaveClass("focus:ring-4");
  });

  // ---- Data-magnet attribute handling ------------------------------------

  it("preserves data-magnet behavior in both motion modes", () => {
    mockUsePathname.mockReturnValue("/");
    
    const magnetProps = { ...defaultProps, "data-magnet": true };
    
    // With motion
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount } = render(
      <ConnectWalletButton {...magnetProps} />
    );
    
    expect(motionContainer.querySelector("button")).toHaveAttribute("data-magnet");
    
    unmount();

    // Without motion
    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(
      <ConnectWalletButton {...magnetProps} />
    );
    
    expect(reducedContainer.querySelector("button")).toHaveAttribute("data-magnet");
  });

  // ---- CSS class consistency ----------------------------------------------

  it("maintains consistent non-animation classes between motion states", () => {
    mockUsePathname.mockReturnValue("/");
    
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount } = render(
      <ConnectWalletButton {...defaultProps} />
    );
    
    const motionButton = motionContainer.querySelector("button")!;
    const motionClasses = Array.from(motionButton.classList)
      .filter(cls => !cls.includes("transition") && !cls.includes("duration") && !cls.includes("scale"));
    
    unmount();

    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(
      <ConnectWalletButton {...defaultProps} />
    );
    
    const reducedButton = reducedContainer.querySelector("button")!;
    const reducedClasses = Array.from(reducedButton.classList);

    // All non-animation classes should be present in reduced motion version
    motionClasses.forEach(cls => {
      expect(reducedClasses).toContain(cls);
    });
  });

  // ---- Vacuousness checks -----------------------------------------------

  it("VACUOUSNESS: test fails if useReducedMotion is ignored", () => {
    mockUseReducedMotion.mockReturnValue(true);
    mockUsePathname.mockReturnValue("/");
    
    render(<ConnectWalletButton {...defaultProps} />);

    const button = screen.getByRole("button");
    
    // If useReducedMotion is ignored, transitions would still be applied
    expect(button).not.toHaveClass("transition-all");
    expect(button).not.toHaveClass("hover:scale-105");
  });

  it("VACUOUSNESS: test fails if animation classes are hardcoded in reduced motion path", () => {
    mockUseReducedMotion.mockReturnValue(true);
    mockUsePathname.mockReturnValue("/");
    
    const { container } = render(<ConnectWalletButton {...defaultProps} />);

    const allElements = container.querySelectorAll("*");
    
    allElements.forEach((element) => {
      const classList = Array.from(element.classList);
      
      const animationClasses = classList.filter((cls) =>
        /transition-|duration-|scale-|animate-/.test(cls)
      );
      
      // If animation classes are hardcoded, this test will catch it
      expect(animationClasses).toHaveLength(0);
    });
  });
});