import React from "react";
import { render, screen } from "@testing-library/react";
import { LeaderboardPodium } from "../LeaderboardPodium";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Mock the useReducedMotion hook
jest.mock("@/hooks/useReducedMotion");
const mockUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

// Mock framer-motion to avoid animation loop issues in JSDOM
jest.mock("framer-motion", () => {
  const React = require("react");
  const createMotionProxy = (): any =>
    new Proxy(
      {},
      {
        get: (_target, key: string) => {
          const Component = ({ children, ...props }: any) =>
            React.createElement(key, props, children);
          Component.displayName = `motion.${key}`;
          return Component;
        },
      }
    );
  
  return {
    motion: createMotionProxy(),
  };
});

// Test data
const mockTopThree = [
  {
    id: "1",
    name: "Alice Predictor",
    avatarUrl: "https://example.com/alice.jpg",
    profit: "1,234.56",
    winRate: 85,
    position: 1,
  },
  {
    id: "2", 
    name: "Bob Trader",
    avatarUrl: "https://example.com/bob.jpg",
    profit: "987.65",
    winRate: 78,
    position: 2,
  },
  {
    id: "3",
    name: "Carol Market",
    avatarUrl: "https://example.com/carol.jpg", 
    profit: "654.32",
    winRate: 72,
    position: 3,
  },
];

describe("LeaderboardPodium — reduced-motion implementation", () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---- Static vs Animated rendering ----------------------------------------

  it("renders different DOM structures for motion vs. reduced-motion", () => {
    // Motion enabled
    mockUseReducedMotion.mockReturnValue(false);
    const { container: motionContainer, unmount: unmountMotion } = render(
      <LeaderboardPodium topThree={mockTopThree} />
    );
    
    const animatedElement = screen.getByTestId("leaderboard-podium-animated");
    expect(animatedElement).toBeInTheDocument();
    expect(screen.queryByTestId("leaderboard-podium-static")).not.toBeInTheDocument();
    
    unmountMotion();

    // Motion reduced
    mockUseReducedMotion.mockReturnValue(true);
    render(<LeaderboardPodium topThree={mockTopThree} />);
    
    const staticElement = screen.getByTestId("leaderboard-podium-static");
    expect(staticElement).toBeInTheDocument();
    expect(screen.queryByTestId("leaderboard-podium-animated")).not.toBeInTheDocument();
  });

  it("static fallback contains all essential user information", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<LeaderboardPodium topThree={mockTopThree} />);

    // Verify all user names are present
    expect(screen.getByText("Alice Predictor")).toBeInTheDocument();
    expect(screen.getByText("Bob Trader")).toBeInTheDocument();
    expect(screen.getByText("Carol Market")).toBeInTheDocument();

    // Verify all profit amounts are shown
    expect(screen.getByText("+1,234.56 XLM")).toBeInTheDocument();
    expect(screen.getByText("+987.65")).toBeInTheDocument();
    expect(screen.getByText("+654.32")).toBeInTheDocument();

    // Verify win rate for 1st place
    expect(screen.getByText("85% Win Rate")).toBeInTheDocument();
  });

  it("static fallback maintains visual hierarchy without motion", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<LeaderboardPodium topThree={mockTopThree} />);

    const staticPodium = screen.getByTestId("leaderboard-podium-static");
    
    // Check that position badges are present
    expect(screen.getByLabelText("1st place winner")).toBeInTheDocument();
    expect(screen.getByLabelText("2nd place")).toBeInTheDocument();
    expect(screen.getByLabelText("3rd place")).toBeInTheDocument();

    // Verify crown emoji is present for 1st place (visual hierarchy indicator)
    expect(staticPodium.textContent).toContain("👑");
  });

  // ---- Motion behavior validation ----------------------------------------

  it("animated version renders framer-motion components when motion is enabled", () => {
    mockUseReducedMotion.mockReturnValue(false);
    const { container } = render(<LeaderboardPodium topThree={mockTopThree} />);

    // Check for motion.div elements (mocked to render as divs)
    const motionElements = container.querySelectorAll("div[data-testid='leaderboard-podium-animated'] > div");
    expect(motionElements.length).toBe(3); // Three podium positions
  });

  it("static fallback has no motion or animation classes", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<LeaderboardPodium topThree={mockTopThree} />);

    const allElements = container.querySelectorAll("*");
    
    allElements.forEach((element) => {
      const classList = Array.from(element.classList);
      
      // No animate-* classes
      expect(classList.every((cls) => !cls.startsWith("animate-"))).toBe(true);
      
      // No motion-* classes
      expect(classList.every((cls) => !cls.startsWith("motion-"))).toBe(true);
      
      // No transition-* classes
      expect(classList.every((cls) => !cls.startsWith("transition-"))).toBe(true);
      
      // No duration-* classes
      expect(classList.every((cls) => !cls.startsWith("duration-"))).toBe(true);
    });
  });

  // ---- Accessibility compliance ------------------------------------------

  it("both motion and reduced-motion paths have identical accessibility attributes", () => {
    // Motion enabled
    mockUseReducedMotion.mockReturnValue(false);
    const { unmount: unmountMotion } = render(<LeaderboardPodium topThree={mockTopThree} />);
    const motionElement = screen.getByTestId("leaderboard-podium-animated");
    const motionRole = motionElement.getAttribute("role");
    const motionAriaLabel = motionElement.getAttribute("aria-label");
    unmountMotion();

    // Motion reduced
    mockUseReducedMotion.mockReturnValue(true);
    render(<LeaderboardPodium topThree={mockTopThree} />);
    const staticElement = screen.getByTestId("leaderboard-podium-static");
    const staticRole = staticElement.getAttribute("role");
    const staticAriaLabel = staticElement.getAttribute("aria-label");

    // Both should have the same accessibility attributes
    expect(motionRole).toBe(staticRole);
    expect(motionAriaLabel).toBe(staticAriaLabel);
  });

  it("position badges have proper accessibility labels in both modes", () => {
    // Test static mode
    mockUseReducedMotion.mockReturnValue(true);
    const { unmount: unmountStatic } = render(<LeaderboardPodium topThree={mockTopThree} />);
    
    expect(screen.getByLabelText("1st place winner")).toBeInTheDocument();
    expect(screen.getByLabelText("2nd place")).toBeInTheDocument(); 
    expect(screen.getByLabelText("3rd place")).toBeInTheDocument();
    
    unmountStatic();

    // Test animated mode
    mockUseReducedMotion.mockReturnValue(false);
    render(<LeaderboardPodium topThree={mockTopThree} />);
    
    expect(screen.getByLabelText("1st place winner")).toBeInTheDocument();
    expect(screen.getByLabelText("2nd place")).toBeInTheDocument();
    expect(screen.getByLabelText("3rd place")).toBeInTheDocument();
  });

  // ---- Prop override behavior ---------------------------------------------

  it("respects explicit reducedMotion prop over hook value", () => {
    // Hook says motion is allowed, but prop overrides to reduced
    mockUseReducedMotion.mockReturnValue(false);
    render(<LeaderboardPodium topThree={mockTopThree} reducedMotion={true} />);
    
    expect(screen.getByTestId("leaderboard-podium-static")).toBeInTheDocument();
    expect(screen.queryByTestId("leaderboard-podium-animated")).not.toBeInTheDocument();
  });

  it("respects explicit reducedMotion=false prop over hook value", () => {
    // Hook says motion should be reduced, but prop overrides to allow motion
    mockUseReducedMotion.mockReturnValue(true);
    render(<LeaderboardPodium topThree={mockTopThree} reducedMotion={false} />);
    
    expect(screen.getByTestId("leaderboard-podium-animated")).toBeInTheDocument();
    expect(screen.queryByTestId("leaderboard-podium-static")).not.toBeInTheDocument();
  });

  // ---- Edge cases -------------------------------------------------------

  it("handles empty topThree array gracefully in both modes", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { unmount: unmountStatic } = render(<LeaderboardPodium topThree={[]} />);
    
    expect(screen.getByText("No Rankings Yet")).toBeInTheDocument();
    
    unmountStatic();

    mockUseReducedMotion.mockReturnValue(false);
    render(<LeaderboardPodium topThree={[]} />);
    
    expect(screen.getByText("No Rankings Yet")).toBeInTheDocument();
  });

  it("handles partial data (missing users) gracefully", () => {
    const partialData = [mockTopThree[0]]; // Only first place
    
    mockUseReducedMotion.mockReturnValue(true);
    const { unmount } = render(<LeaderboardPodium topThree={partialData} />);
    
    // Should render without crashing
    expect(screen.getByTestId("leaderboard-podium-static")).toBeInTheDocument();
    expect(screen.getByText("Alice Predictor")).toBeInTheDocument();
    
    unmount();

    mockUseReducedMotion.mockReturnValue(false);
    render(<LeaderboardPodium topThree={partialData} />);
    expect(screen.getByTestId("leaderboard-podium-animated")).toBeInTheDocument();
  });

  // ---- Vacuousness checks ------------------------------------------------

  it("VACUOUSNESS: test fails if reduced-motion guard is removed", () => {
    mockUseReducedMotion.mockReturnValue(true);
    render(<LeaderboardPodium topThree={mockTopThree} />);

    // With the guard: static fallback SHOULD be rendered
    expect(screen.getByTestId("leaderboard-podium-static")).toBeInTheDocument();
    
    // With the guard: animated version should NOT be rendered
    expect(screen.queryByTestId("leaderboard-podium-animated")).not.toBeInTheDocument();
    
    // If the guard is removed, both conditions above would fail
  });

  it("VACUOUSNESS: test fails if static fallback has animation classes", () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { container } = render(<LeaderboardPodium topThree={mockTopThree} />);

    const allElements = container.querySelectorAll("*");
    
    // If someone adds animation classes to the static fallback,
    // this test will fail, ensuring the static fallback stays static.
    allElements.forEach((element) => {
      const classList = Array.from(element.classList);
      
      const animationClasses = classList.filter((cls) =>
        /animate-|transition-|duration-|motion-/.test(cls)
      );
      
      expect(animationClasses).toHaveLength(0);
    });
  });
});