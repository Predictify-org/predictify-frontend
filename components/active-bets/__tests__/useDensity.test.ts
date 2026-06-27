import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDensity, densityTokens, setGlobalDensity, getGlobalDensity } from "@/hooks/useDensity";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("useDensity", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
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
    expect(result.current.isReady).toBe(false);
    act(() => {});
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
    expect(densityTokens.cozy.cardPadding).toBe("p-6");
    expect(densityTokens.compact.cardPadding).toBe("p-4");
    expect(densityTokens.ultra.cardPadding).toBe("p-3");
  });

  it("ultra hides description only", () => {
    expect(densityTokens.ultra.showDescription).toBe(false);
    expect(densityTokens.ultra.showMetaRow).toBe(true);
  });
});