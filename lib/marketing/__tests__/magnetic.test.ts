import {
  computeMagnetOffset,
  CURSOR_RING_HOVER_SCALE,
  CURSOR_RING_SIZE_PX,
  isMarketingCursorEffectsEnabled,
  MAX_MAGNET_PULL_PX,
} from "../magnetic";

describe("computeMagnetOffset", () => {
  const rect = { left: 100, top: 100, width: 100, height: 40 };

  it("returns zero offset when the cursor is outside the influence radius", () => {
    expect(computeMagnetOffset(0, 0, rect)).toEqual({ x: 0, y: 0 });
  });

  it("returns zero offset when the cursor is at the element center", () => {
    expect(computeMagnetOffset(150, 120, rect)).toEqual({ x: 0, y: 0 });
  });

  it("pulls toward the cursor and caps at MAX_MAGNET_PULL_PX", () => {
    const offset = computeMagnetOffset(150, 100, rect);
    const magnitude = Math.hypot(offset.x, offset.y);

    expect(magnitude).toBeGreaterThan(0);
    expect(magnitude).toBeLessThanOrEqual(MAX_MAGNET_PULL_PX + 0.001);
    expect(offset.y).toBeLessThan(0);
  });

  it("respects a custom max pull value", () => {
    const offset = computeMagnetOffset(150, 100, rect, 3);
    expect(Math.hypot(offset.x, offset.y)).toBeLessThanOrEqual(3.001);
  });
});

describe("isMarketingCursorEffectsEnabled", () => {
  it("is disabled when reduced motion is preferred", () => {
    expect(isMarketingCursorEffectsEnabled(true, false)).toBe(false);
  });

  it("is disabled on coarse (touch) pointers", () => {
    expect(isMarketingCursorEffectsEnabled(false, true)).toBe(false);
  });

  it("is enabled for fine pointers without reduced motion", () => {
    expect(isMarketingCursorEffectsEnabled(false, false)).toBe(true);
  });
});

describe("marketing cursor constants", () => {
  it("uses a 12px ring that scales 2x on hover", () => {
    expect(CURSOR_RING_SIZE_PX).toBe(12);
    expect(CURSOR_RING_HOVER_SCALE).toBe(2);
  });
});
