import { render, act, fireEvent } from "@testing-library/react";
import { MarketingCursorFollower } from "../cursor-follower";

function mockMatchMedia(matches: { reducedMotion?: boolean; coarsePointer?: boolean }) {
  const queries: Record<string, boolean> = {
    "(prefers-reduced-motion: reduce)": Boolean(matches.reducedMotion),
    "(pointer: coarse)": Boolean(matches.coarsePointer),
  };

  window.matchMedia = jest.fn((query: string) => ({
    matches: queries[query] ?? false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as typeof window.matchMedia;
}

function dispatchPointerMove(target: Element, clientX: number, clientY: number) {
  fireEvent(
    target,
    new MouseEvent("pointermove", {
      clientX,
      clientY,
      bubbles: true,
    })
  );
}

async function flushAnimationFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

describe("MarketingCursorFollower", () => {
  beforeEach(() => {
    document.documentElement.style.cssText = "";
    mockMatchMedia({ reducedMotion: false, coarsePointer: false });
  });

  it("renders the follower ring for enabled environments", () => {
    const { getByTestId } = render(<MarketingCursorFollower />);
    expect(getByTestId("marketing-cursor-follower")).toHaveClass(
      "marketing-cursor-follower"
    );
  });

  it("does not attach pointer listeners when reduced motion is preferred", () => {
    mockMatchMedia({ reducedMotion: true, coarsePointer: false });
    const addSpy = jest.spyOn(document, "addEventListener");

    render(<MarketingCursorFollower />);

    expect(
      addSpy.mock.calls.some(([eventName]) => eventName === "pointermove")
    ).toBe(false);

    addSpy.mockRestore();
  });

  it("does not attach pointer listeners on coarse pointer devices", () => {
    mockMatchMedia({ reducedMotion: false, coarsePointer: true });
    const addSpy = jest.spyOn(document, "addEventListener");

    render(<MarketingCursorFollower />);

    expect(
      addSpy.mock.calls.some(([eventName]) => eventName === "pointermove")
    ).toBe(false);

    addSpy.mockRestore();
  });

  it("updates CSS custom properties from pointer movement without React re-renders", async () => {
    const { getByRole } = render(
      <>
        <MarketingCursorFollower />
        <section data-marketing-cursor-section>
          <button type="button" data-magnet>
            <span className="magnetic-inner">CTA</span>
          </button>
        </section>
      </>
    );

    dispatchPointerMove(getByRole("button"), 180, 140);
    await flushAnimationFrame();

    expect(document.documentElement.style.getPropertyValue("--cursor-x")).toBe(
      "180px"
    );
    expect(document.documentElement.style.getPropertyValue("--cursor-y")).toBe(
      "140px"
    );
  });

  it("resets follower state on window blur", async () => {
    const { getByRole } = render(
      <>
        <MarketingCursorFollower />
        <section data-marketing-cursor-section>
          <button type="button" data-magnet>
            <span className="magnetic-inner">CTA</span>
          </button>
        </section>
      </>
    );

    dispatchPointerMove(getByRole("button"), 120, 120);
    await flushAnimationFrame();

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    const ring = document.querySelector(".marketing-cursor-follower") as HTMLElement;
    expect(ring.style.opacity).toBe("0");
  });

  it("pauses updates while pointer lock is active", () => {
    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      writable: true,
      value: document.body,
    });

    render(
      <>
        <MarketingCursorFollower />
        <section data-marketing-cursor-section>
          <button type="button" data-magnet>
            <span className="magnetic-inner">CTA</span>
          </button>
        </section>
      </>
    );

    act(() => {
      document.dispatchEvent(new Event("pointerlockchange"));
    });

    const ring = document.querySelector(".marketing-cursor-follower") as HTMLElement;
    expect(ring.style.opacity).toBe("0");

    Object.defineProperty(document, "pointerLockElement", {
      configurable: true,
      writable: true,
      value: null,
    });
  });
});
