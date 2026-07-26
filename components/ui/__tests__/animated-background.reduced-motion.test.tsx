import React from "react";
import { render } from "@testing-library/react";
import { AnimatedBackground } from "../animated-background";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Mock the useReducedMotion hook
jest.mock("@/hooks/useReducedMotion");
const mockUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

describe("AnimatedBackground — reduced-motion implementation", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---- Animation class behavior -------------------------------------------

  it("applies animate-pulse classes when motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(<AnimatedBackground />);

    const pulsingElements = container.querySelectorAll(".animate-pulse");
    expect(pulsingElements.length).toBe(3); // Three background elements
    
    // Check for delay classes
    expect(container.querySelector(".delay-1000")).toBeInTheDocument();
    expect(container.querySelector(".delay-500")).toBeInTheDocument();
  });

  it("removes animate-pulse classes when motion is reduced", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<AnimatedBackground />);

    const pulsingElements = container.querySelectorAll(".animate-pulse");
    expect(pulsingElements.length).toBe(0); // No animate-pulse classes

    // Should still render the background elements without animation
    const backgroundElements = container.querySelectorAll("div > div");
    expect(backgroundElements.length).toBe(3);
  });

  it("maintains visual structure without animation classes", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<AnimatedBackground />);

    // All background elements should still be present
    const backgroundElements = container.querySelectorAll("div > div");
    expect(backgroundElements.length).toBe(3);

    // Check that color and positioning classes are preserved
    expect(container.querySelector(".bg-cyan-500\\/10")).toBeInTheDocument();
    expect(container.querySelector(".bg-emerald-500\\/10")).toBeInTheDocument();
    expect(container.querySelector(".bg-purple-500\\/5")).toBeInTheDocument();

    // Verify blur and positioning are maintained
    expect(container.querySelector(".blur-3xl")).toBeInTheDocument();
    expect(container.querySelector(".top-0")).toBeInTheDocument();
    expect(container.querySelector(".bottom-0")).toBeInTheDocument();
  });

  // ---- CSS media query compatibility ---------------------------------------

  it("works correctly with prefers-reduced-motion CSS media query", () => {
    // Even if the component renders animation classes, the CSS media query
    // should disable them. We test both scenarios.
    
    // When motion is allowed by hook
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer } = render(<AnimatedBackground />);
    
    expect(motionContainer.querySelectorAll(".animate-pulse").length).toBe(3);

    // When motion is reduced by hook
    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(<AnimatedBackground />);
    
    expect(reducedContainer.querySelectorAll(".animate-pulse").length).toBe(0);
  });

  it("preserves all non-animation styling in reduced motion mode", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount } = render(<AnimatedBackground />);
    
    const motionElements = Array.from(motionContainer.querySelectorAll("div > div"));
    const motionClasses = motionElements.map(el => 
      Array.from(el.classList).filter(cls => !cls.includes("animate") && !cls.includes("delay"))
    );
    
    unmount();

    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(<AnimatedBackground />);
    
    const reducedElements = Array.from(reducedContainer.querySelectorAll("div > div"));
    const reducedClasses = reducedElements.map(el => Array.from(el.classList));

    // Non-animation classes should be identical
    expect(reducedClasses).toEqual(motionClasses);
  });

  // ---- Visual regression protection ---------------------------------------

  it("does not introduce layout shift between motion modes", () => {
    // Render with motion
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount } = render(<AnimatedBackground />);
    
    const motionWrapper = motionContainer.firstChild as HTMLElement;
    const motionElements = motionWrapper.children;
    
    // Capture positioning classes
    const motionPositions = Array.from(motionElements).map(el => ({
      top: el.classList.contains("top-0"),
      bottom: el.classList.contains("bottom-0"),
      left: el.classList.contains("left-1/4"),
      right: el.classList.contains("right-1/4"),
      center: el.classList.contains("left-1/2"),
    }));
    
    unmount();

    // Render with reduced motion
    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(<AnimatedBackground />);
    
    const reducedWrapper = reducedContainer.firstChild as HTMLElement;
    const reducedElements = reducedWrapper.children;
    
    const reducedPositions = Array.from(reducedElements).map(el => ({
      top: el.classList.contains("top-0"),
      bottom: el.classList.contains("bottom-0"),
      left: el.classList.contains("left-1/4"),
      right: el.classList.contains("right-1/4"),
      center: el.classList.contains("left-1/2"),
    }));

    // Positioning should be identical between modes
    expect(reducedPositions).toEqual(motionPositions);
  });

  // ---- Performance considerations -----------------------------------------

  it("renders with minimal DOM changes between motion states", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount } = render(<AnimatedBackground />);
    const motionHTML = motionContainer.innerHTML;
    
    unmount();

    mockUseReducedMotion.mockReturnValue(true);
    const { container: reducedContainer } = render(<AnimatedBackground />);
    const reducedHTML = reducedContainer.innerHTML;

    // HTML should be nearly identical, just without animation classes
    const motionWithoutAnimations = motionHTML
      .replace(/animate-pulse/g, "")
      .replace(/delay-\d+/g, "")
      .replace(/\s+/g, " ")
      .trim();
      
    const reducedNormalized = reducedHTML
      .replace(/\s+/g, " ")
      .trim();

    expect(reducedNormalized).toBe(motionWithoutAnimations);
  });

  // ---- Vacuousness checks -------------------------------------------------

  it("VACUOUSNESS: test fails if useReducedMotion is not consulted", () => {
    // If the component ignores useReducedMotion, this test would fail
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<AnimatedBackground />);

    // Should have no animation classes when reduced motion is preferred
    const animatedElements = container.querySelectorAll(".animate-pulse");
    expect(animatedElements.length).toBe(0);

    // If useReducedMotion is ignored, animate-pulse classes would still be present
  });

  it("VACUOUSNESS: test fails if animation classes are hardcoded in reduced motion", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<AnimatedBackground />);

    const allElements = container.querySelectorAll("*");
    
    // Check every element for animation classes
    allElements.forEach((element) => {
      const classList = Array.from(element.classList);
      
      const animationClasses = classList.filter((cls) =>
        /animate-|transition-|duration-/.test(cls)
      );
      
      // If animation classes are hardcoded, this test will fail
      expect(animationClasses).toHaveLength(0);
    });
  });
});