import React from "react";
import { render, screen } from "@testing-library/react";
import { Hero } from "../hero";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Mock the useReducedMotion hook
jest.mock("@/hooks/useReducedMotion");
const mockUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

// Mock the useParallax hook to avoid DOM manipulation issues in tests
jest.mock("@/hooks/use-parallax", () => ({
  useParallax: () => ({ current: null }),
}));

// Mock Next.js Image component
jest.mock("next/image", () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  };
});

describe("Hero — reduced-motion implementation", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---- Animation class behavior -------------------------------------------

  it("applies animate-fade-in classes when motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(<Hero />);

    const fadeInElements = container.querySelectorAll(".animate-fade-in");
    expect(fadeInElements.length).toBe(2); // Win badge and success badge
  });

  it("removes animate-fade-in classes when motion is reduced", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Hero />);

    const fadeInElements = container.querySelectorAll(".animate-fade-in");
    expect(fadeInElements.length).toBe(0); // No animation classes
  });

  it("notification badges remain visible without animation", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<Hero />);

    // Win notification badge should be present
    expect(screen.getByText("+250 USDC Won!")).toBeInTheDocument();
    
    // Success notification badge should be present  
    expect(screen.getByText("Prediction Correct!")).toBeInTheDocument();
  });

  it("preserves all visual content in reduced motion mode", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<Hero />);

    // Main heading text
    expect(screen.getByText("Predict.")).toBeInTheDocument();
    expect(screen.getByText("Repeat.")).toBeInTheDocument();
    expect(screen.getByText("Earn.")).toBeInTheDocument();

    // Description text
    expect(screen.getByText(/Join the decentralized prediction platform/)).toBeInTheDocument();

    // CTA buttons
    expect(screen.getByText("Start Predicting")).toBeInTheDocument();
    expect(screen.getByText("Learn More")).toBeInTheDocument();

    // Markets preview content
    expect(screen.getByText("Popular Prediction Markets")).toBeInTheDocument();
    expect(screen.getByText("Bitcoin Price")).toBeInTheDocument();
    expect(screen.getByText("US Election 2024")).toBeInTheDocument();
    expect(screen.getByText("Tesla Q2 Earnings")).toBeInTheDocument();
  });

  // ---- Notification badge positioning ------------------------------------

  it("maintains badge positioning without animation in reduced motion", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount } = render(<Hero />);
    
    const winBadge = motionContainer.querySelector("div[class*='absolute'][class*='right-0'][class*='-top-4']");
    const successBadge = motionContainer.querySelector("div[class*='absolute'][class*='bottom-0'][class*='right-0']");
    
    expect(winBadge).toBeInTheDocument();
    expect(successBadge).toBeInTheDocument();
    
    unmount();

    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(<Hero />);
    
    const reducedWinBadge = reducedContainer.querySelector("div[class*='absolute'][class*='right-0'][class*='-top-4']");
    const reducedSuccessBadge = reducedContainer.querySelector("div[class*='absolute'][class*='bottom-0'][class*='right-0']");
    
    expect(reducedWinBadge).toBeInTheDocument();
    expect(reducedSuccessBadge).toBeInTheDocument();
  });

  it("badges maintain proper visual hierarchy without animation", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Hero />);

    // Check z-index and positioning classes are preserved
    const badges = container.querySelectorAll("div[class*='z-20']");
    expect(badges.length).toBe(2); // Two notification badges

    // Check shadow and styling are maintained
    const shadowElements = container.querySelectorAll("div[class*='shadow-2xl']");
    expect(shadowElements.length).toBeGreaterThanOrEqual(2);
  });

  // ---- Market card interactions -----------------------------------------

  it("market cards remain interactive without transition animations", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<Hero />);

    // Market cards should be present and accessible
    const marketCards = screen.getAllByRole("button", { name: /Place Your Prediction/i });
    expect(marketCards.length).toBe(1);

    // Individual market content should be accessible
    expect(screen.getByText("Will BTC exceed $75K by Q3 2023?")).toBeInTheDocument();
    expect(screen.getByText("Democratic party to win?")).toBeInTheDocument();
    expect(screen.getByText("Will exceed analyst expectations?")).toBeInTheDocument();
  });

  it("preserves hover states styling without transitions", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Hero />);

    // Button hover states should still be defined (via CSS)
    const startButton = screen.getByText("Start Predicting").closest("button");
    const learnButton = screen.getByText("Learn More").closest("button");
    
    expect(startButton).toHaveClass("hover:bg-white/20");
    expect(learnButton).toHaveClass("hover:bg-white/20");
  });

  // ---- Accessibility preservation ----------------------------------------

  it("maintains all ARIA attributes and semantic structure", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount } = render(<Hero />);
    
    // Capture ARIA attributes from motion version
    const motionButtons = Array.from(motionContainer.querySelectorAll("button")).map(btn => ({
      text: btn.textContent,
      ariaLabel: btn.getAttribute("aria-label"),
      type: btn.getAttribute("type"),
    }));
    
    unmount();

    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(<Hero />);
    
    const reducedButtons = Array.from(reducedContainer.querySelectorAll("button")).map(btn => ({
      text: btn.textContent,
      ariaLabel: btn.getAttribute("aria-label"),
      type: btn.getAttribute("type"),
    }));

    // ARIA attributes should be identical
    expect(reducedButtons).toEqual(motionButtons);
  });

  it("preserves heading hierarchy in reduced motion mode", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<Hero />);

    // Main headings
    const h1Elements = screen.getAllByRole("heading", { level: 1 });
    expect(h1Elements.length).toBe(3); // Predict., Repeat., Earn.

    // Section heading
    const h2Elements = screen.getAllByRole("heading", { level: 2 });
    expect(h2Elements.length).toBe(1); // Popular Prediction Markets

    // Market headings
    const h3Elements = screen.getAllByRole("heading", { level: 3 });
    expect(h3Elements.length).toBe(3); // Three market titles
  });

  // ---- Layout stability --------------------------------------------------

  it("does not cause layout shift between motion modes", () => {
    // Test that switching between motion modes doesn't change layout
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount } = render(<Hero />);
    
    const motionGrid = motionContainer.querySelector(".grid");
    const motionGridClasses = motionGrid ? Array.from(motionGrid.classList) : [];
    
    unmount();

    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(<Hero />);
    
    const reducedGrid = reducedContainer.querySelector(".grid");
    const reducedGridClasses = reducedGrid ? Array.from(reducedGrid.classList) : [];

    // Grid layout classes should be identical
    expect(reducedGridClasses).toEqual(motionGridClasses);
  });

  it("maintains responsive breakpoints in both motion modes", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Hero />);

    // Check responsive classes are preserved
    const responsiveElements = container.querySelectorAll("[class*='lg:'], [class*='sm:'], [class*='md:']");
    expect(responsiveElements.length).toBeGreaterThan(0);

    // Grid should maintain responsive behavior
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("lg:grid-cols-2");
  });

  // ---- Performance considerations ----------------------------------------

  it("renders efficiently without animation overhead", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Hero />);

    // Should not have any animation-related attributes
    const allElements = container.querySelectorAll("*");
    let hasAnimationAttributes = false;
    
    allElements.forEach(element => {
      const attributes = Array.from(element.attributes);
      attributes.forEach(attr => {
        if (attr.name.includes("animate") || attr.value.includes("animate")) {
          hasAnimationAttributes = true;
        }
      });
    });

    expect(hasAnimationAttributes).toBe(false);
  });

  // ---- Vacuousness checks -----------------------------------------------

  it("VACUOUSNESS: test fails if useReducedMotion is ignored", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Hero />);

    // If useReducedMotion is ignored, animate-fade-in would still be present
    const animatedElements = container.querySelectorAll(".animate-fade-in");
    expect(animatedElements.length).toBe(0);
  });

  it("VACUOUSNESS: test fails if animation classes are hardcoded", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<Hero />);

    const allElements = container.querySelectorAll("*");
    
    allElements.forEach((element) => {
      const classList = Array.from(element.classList);
      
      const animationClasses = classList.filter((cls) =>
        /animate-fade-in|animate-slide-up|animate-bounce/.test(cls)
      );
      
      // If animation classes are hardcoded despite reduced motion, this fails
      expect(animationClasses).toHaveLength(0);
    });
  });
});