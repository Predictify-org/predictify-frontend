import { act } from "@testing-library/react";
import { useUserLimitsStore } from "../userLimits";

function resetStore() {
  act(() => {
    useUserLimitsStore.setState({ limitsByMarket: {} });
  });
}

describe("useUserLimitsStore", () => {
  beforeEach(resetStore);

  it("calculates remaining allowance for a market", () => {
    act(() => {
      useUserLimitsStore.getState().setLimit("btc-price", {
        dailyLimit: 500,
        usedToday: 125,
        currency: "USDC",
      });
    });

    expect(useUserLimitsStore.getState().getRemaining("btc-price")).toBe(375);
    expect(useUserLimitsStore.getState().getUsagePercent("btc-price")).toBe(25);
  });

  it("clamps exhausted allowance to zero remaining and full usage", () => {
    act(() => {
      useUserLimitsStore.getState().setLimit("market-1", {
        dailyLimit: 100,
        usedToday: 140,
        currency: "USDC",
      });
    });

    expect(useUserLimitsStore.getState().getRemaining("market-1")).toBe(0);
    expect(useUserLimitsStore.getState().getUsagePercent("market-1")).toBe(100);
  });
});
