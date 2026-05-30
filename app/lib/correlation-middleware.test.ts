import { getCorrelationContext, runWithCorrelation } from "./correlation-middleware";

describe("correlation-middleware", () => {
  it("propagates correlation context", () => {
    runWithCorrelation("test-correlation-id", () => {
      const context = getCorrelationContext();
      expect(context?.correlationId).toBe("test-correlation-id");
    });
  });

  it("returns undefined outside of correlation context", () => {
    const context = getCorrelationContext();
    expect(context).toBeUndefined();
  });
});
