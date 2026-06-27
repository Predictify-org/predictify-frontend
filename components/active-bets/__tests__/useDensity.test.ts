import { renderHook, act } from "@testing-library/react";
import { useDensity, densityTokens } from "@/hooks/useDensity";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe("useDensity", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it("defaults to cozy", () => {
    const { result } = renderHook(() => useDensity());
    expect(result.current.density).toBe("cozy");
  });

  it("reads from localStorage", () => {
    localStorageMock.setItem("predictify-density", "compact");
    const { result } = renderHook(() => useDensity());
    act(() => {});
    expect(result.current.density).toBe("compact");
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useDensity());
    act(() => result.current.setDensity("ultra"));
    expect(result.current.density).toBe("ultra");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("predictify-density", "ultra");
  });

  it("cycles through densities", () => {
    const { result } = renderHook(() => useDensity());
    act(() => result.current.setDensity("cozy"));
    act(() => result.current.cycleDensity());
    expect(result.current.density).toBe("compact");
    act(() => result.current.cycleDensity());
    expect(result.current.density).toBe("ultra");
    act(() => result.current.cycleDensity());
    expect(result.current.density).toBe("cozy");
  });

  it("returns correct tokens", () => {
    const { result } = renderHook(() => useDensity());
    act(() => result.current.setDensity("compact"));
    expect(result.current.tokens).toEqual(densityTokens.compact);
  });

  it("exposes all densities", () => {
    const { result } = renderHook(() => useDensity());
    expect(result.current.densities).toEqual(["cozy", "compact", "ultra"]);
  });

  it("isReady after hydration", () => {
    const { result } = renderHook(() => useDensity());
    expect(result.current.isReady).toBe(true);
  });
});

describe("densityTokens", () => {
  it("has all three variants", () => {
    expect(densityTokens).toHaveProperty("cozy");
    expect(densityTokens).toHaveProperty("compact");
    expect(densityTokens).toHaveProperty("ultra");
  });

  it("cozy has largest padding", () => {
    expect(densityTokens.cozy.cardPadding).toBe("p-4");
    expect(densityTokens.compact.cardPadding).toBe("p-2.5");
    expect(densityTokens.ultra.cardPadding).toBe("p-2");
  });

  it("ultra hides description and dates", () => {
    expect(densityTokens.ultra.showDescription).toBe(false);
    expect(densityTokens.ultra.showDates).toBe(false);
  });
});