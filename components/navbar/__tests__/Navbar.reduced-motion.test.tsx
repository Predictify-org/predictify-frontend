import React from "react";
import { render, screen } from "@testing-library/react";
import { Navbar } from "../Navbar";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

// Mock the useReducedMotion hook
jest.mock("@/hooks/useReducedMotion");
const mockUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

// Mock other hooks and components
jest.mock("@/context/WalletContext", () => ({
  useWalletContext: () => ({
    connected: false,
    isLoading: false,
  }),
}));

jest.mock("@/lib/quiet-hours", () => ({
  useQuietHours: () => ({ active: false }),
}));

jest.mock("@/lib/network-tint", () => ({
  getNetworkTint: () => ({ tint: "#00cffc" }),
}));

// Mock components that might have their own animations
jest.mock("../SearchInput", () => ({
  SearchInput: () => <div data-testid="search-input">Search Input</div>,
}));

jest.mock("../NetworkSwitcher", () => ({
  NetworkSwitcher: () => <div data-testid="network-switcher">Network Switcher</div>,
}));

jest.mock("../WalletMenu", () => ({
  WalletMenu: () => <div data-testid="wallet-menu">Wallet Menu</div>,
}));

jest.mock("../WalletBalance", () => ({
  WalletBalance: () => <div data-testid="wallet-balance">Wallet Balance</div>,
}));

jest.mock("@/components/changelog/WhatsNewDrawer", () => ({
  WhatsNewDrawer: () => <div data-testid="whats-new-drawer">What's New</div>,
}));

describe("Navbar — reduced-motion implementation", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseTheme.mockReturnValue({
      theme: "dark",
      setTheme: jest.fn(),
    });
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => "mainnet"),
        setItem: jest.fn(),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---- Navigation link transitions ---------------------------------------

  it("applies transition classes to nav links when motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(<Navbar />);

    const navLinks = container.querySelectorAll("nav a");
    navLinks.forEach(link => {
      expect(link).toHaveClass("transition-all");
      expect(link).toHaveClass("duration-300");
    });
  });

  it("removes transition classes from nav links when motion is reduced", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Navbar />);

    const navLinks = container.querySelectorAll("nav a");
    navLinks.forEach(link => {
      expect(link).not.toHaveClass("transition-all");
      expect(link).not.toHaveClass("duration-300");
      
      // But should maintain other styling
      expect(link).toHaveClass("text-sm");
      expect(link).toHaveClass("font-medium");
    });
  });

  // ---- Search input transitions ------------------------------------------

  it("applies transition to search input when motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(<Navbar />);

    const searchInput = container.querySelector("#navbar-search");
    expect(searchInput).toHaveClass("transition-all");
  });

  it("removes transition from search input when motion is reduced", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Navbar />);

    const searchInput = container.querySelector("#navbar-search");
    expect(searchInput).not.toHaveClass("transition-all");
    
    // Should maintain functional styling
    expect(searchInput).toHaveClass("focus:ring-1");
    expect(searchInput).toHaveClass("focus:ring-cyan-400");
  });

  // ---- Connect wallet button transitions --------------------------------

  it("applies scale and transition effects to connect button when motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(<Navbar />);

    const connectButton = screen.getByText("Connect Wallet").closest("button");
    expect(connectButton).toHaveClass("transition-all");
    expect(connectButton).toHaveClass("duration-150");
    expect(connectButton).toHaveClass("active:scale-95");
  });

  it("removes scale and transition effects from connect button when motion is reduced", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Navbar />);

    const connectButton = screen.getByText("Connect Wallet").closest("button");
    expect(connectButton).not.toHaveClass("transition-all");
    expect(connectButton).not.toHaveClass("duration-150");
    expect(connectButton).not.toHaveClass("active:scale-95");
    
    // Should maintain button styling
    expect(connectButton).toHaveClass("bg-gradient-to-br");
    expect(connectButton).toHaveClass("text-[#004a5d]");
  });

  // ---- Theme toggle button transitions ----------------------------------

  it("applies transition to theme toggle when motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(<Navbar />);

    const themeButton = container.querySelector("button[aria-label*='Switch to']");
    expect(themeButton).toHaveClass("transition-colors");
  });

  it("removes transition from theme toggle when motion is reduced", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Navbar />);

    const themeButton = container.querySelector("button[aria-label*='Switch to']");
    expect(themeButton).not.toHaveClass("transition-colors");
    
    // Should maintain hover states and other styling
    expect(themeButton).toHaveClass("hover:text-white");
    expect(themeButton).toHaveClass("hover:bg-slate-800");
  });

  // ---- Mobile navigation transitions -------------------------------------

  it("handles mobile navigation transitions appropriately", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(<Navbar />);

    // Mobile nav items should have transitions
    const mobileNavItems = container.querySelectorAll("nav a[class*='min-h-[44px]']");
    mobileNavItems.forEach(item => {
      expect(item.className).toContain("transition-all");
    });
  });

  it("removes transitions from mobile navigation when motion is reduced", () => {
    mockUseReducedMotion.mockReturnValue(true);  
    const { container } = render(<Navbar />);

    const mobileNavItems = container.querySelectorAll("nav a[class*='min-h-[44px]']");
    mobileNavItems.forEach(item => {
      expect(item.className).not.toContain("transition-all");
      
      // Should maintain layout classes
      expect(item).toHaveClass("min-h-[44px]");
      expect(item).toHaveClass("min-w-[44px]");
    });
  });

  // ---- Active state preservation ----------------------------------------

  it("maintains active navigation states without transitions", () => {
    mockUsePathname.mockReturnValue("/markets");
    mockUseReducedMotion.mockReturnValue(true);
    
    const { container } = render(<Navbar />);
    
    // Active link should still be visually distinguished
    const activeLink = container.querySelector("a[href='/markets']");
    expect(activeLink).toHaveStyle({ 
      color: expect.any(String),
      borderBottom: expect.any(String) 
    });
  });

  it("preserves hover states styling without transition animations", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Navbar />);

    // Links should still have hover classes (handled by CSS media query)
    const navLinks = container.querySelectorAll("nav a");
    navLinks.forEach(link => {
      if (!link.style.color) { // Not active link
        expect(link).toHaveClass("hover:text-slate-200");
      }
    });
  });

  // ---- Functionality preservation ---------------------------------------

  it("maintains all interactive functionality in reduced motion mode", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const mockSetTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      theme: "dark", 
      setTheme: mockSetTheme,
    });

    const { container } = render(<Navbar />);

    // Theme toggle should still work
    const themeButton = container.querySelector("button[aria-label*='Switch to']");
    themeButton?.click();
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("preserves navigation accessibility in reduced motion mode", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<Navbar />);

    // Search input should maintain accessibility
    const searchInput = screen.getByLabelText("Search markets");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute("aria-label", "Search markets");

    // Theme button should maintain accessibility
    const themeButton = screen.getByLabelText(/Switch to/);
    expect(themeButton).toBeInTheDocument();
  });

  // ---- Layout stability -------------------------------------------------

  it("maintains identical layout between motion modes", () => {
    // Capture layout with motion
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount } = render(<Navbar />);
    
    const motionNav = motionContainer.querySelector("nav");
    const motionNavClasses = motionNav ? Array.from(motionNav.classList) : [];
    
    unmount();

    // Capture layout without motion
    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(<Navbar />);
    
    const reducedNav = reducedContainer.querySelector("nav");
    const reducedNavClasses = reducedNav ? Array.from(reducedNav.classList) : [];

    // Layout classes should be identical
    const layoutClasses = motionNavClasses.filter(cls => 
      !cls.includes("transition") && !cls.includes("duration")
    );
    
    layoutClasses.forEach(cls => {
      expect(reducedNavClasses).toContain(cls);
    });
  });

  // ---- Responsive behavior -----------------------------------------------

  it("maintains responsive behavior in reduced motion mode", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Navbar />);

    // Desktop nav should be hidden on mobile
    const desktopNav = container.querySelector("nav .hidden.lg\\:flex");
    expect(desktopNav).toBeInTheDocument();

    // Mobile header should be visible on mobile
    const mobileHeader = container.querySelector("header.md\\:hidden");
    expect(mobileHeader).toBeInTheDocument();
  });

  // ---- Vacuousness checks -----------------------------------------------

  it("VACUOUSNESS: test fails if useReducedMotion is not consulted", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Navbar />);

    // If useReducedMotion is ignored, transitions would still be present
    const elementsWithTransitions = container.querySelectorAll(".transition-all, .transition-colors");
    expect(elementsWithTransitions.length).toBe(0);
  });

  it("VACUOUSNESS: test fails if transition classes are hardcoded despite reduced motion", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Navbar />);

    const allElements = container.querySelectorAll("*");
    
    allElements.forEach((element) => {
      const classList = Array.from(element.classList);
      
      const animationClasses = classList.filter((cls) =>
        /transition-|duration-|scale-/.test(cls)
      );
      
      // If transition classes are hardcoded despite reduced motion preference
      expect(animationClasses).toHaveLength(0);
    });
  });
});