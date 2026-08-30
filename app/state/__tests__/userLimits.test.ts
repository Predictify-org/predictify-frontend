/**
 * userLimits.test.ts
 *
 * Unit tests for the useUserLimitsStore client-side state.
 */

import { act } from "@testing-library/react";
import { useUserLimitsStore } from "../userLimits";

describe("useUserLimitsStore", () => {
  beforeEach(() => {
    act(() => {
      useUserLimitsStore.setState({
        remainingDailyAllowance: {
          "btc-price": 120,
          "us-election": 240,
          "tesla-earnings": 90,
        },
      });
    });
  });

  it("returns the configured allowance for a known market", () => {
    expect(
      useUserLimitsStore.getState().getRemainingDailyAllowance("btc-price"),
    ).toBe(120);
  });

  it("returns zero when a market has no configured allowance", () => {
    expect(
      useUserLimitsStore
        .getState()
        .getRemainingDailyAllowance("unknown-market"),
    ).toBe(0);
  });

  it("sets a new allowance and clamps negative values to zero", () => {
    act(() => {
      useUserLimitsStore
        .getState()
        .setRemainingDailyAllowance("btc-price", -10);
    });

    expect(
      useUserLimitsStore.getState().getRemainingDailyAllowance("btc-price"),
    ).toBe(0);
  });

  it("decrements the allowance without going below zero", () => {
    act(() => {
      useUserLimitsStore
        .getState()
        .decrementDailyAllowance("tesla-earnings", 50);
      useUserLimitsStore
        .getState()
        .decrementDailyAllowance("tesla-earnings", 100);
    });

    expect(
      useUserLimitsStore
        .getState()
        .getRemainingDailyAllowance("tesla-earnings"),
    ).toBe(0);
  });
});
