import { maskAmount } from "../maskAmount";

/**
 * Constant length is an intentional privacy property so that balance magnitude
 * is never leaked to observers regardless of how large or formatted the value is.
 */

describe("utils/maskAmount", () => {
  const expectedMask = "••••";

  it("returns exactly '••••' for integers", () => {
    expect(maskAmount(0)).toBe(expectedMask);
    expect(maskAmount(42)).toBe(expectedMask);
    expect(maskAmount(1000)).toBe(expectedMask);
    expect(maskAmount("100")).toBe(expectedMask);
  });

  it("returns exactly '••••' for decimals", () => {
    expect(maskAmount(12.3456789)).toBe(expectedMask);
    expect(maskAmount(0.000001)).toBe(expectedMask);
    expect(maskAmount("3.14159")).toBe(expectedMask);
  });

  it("returns exactly '••••' for negatives", () => {
    expect(maskAmount(-5)).toBe(expectedMask);
    expect(maskAmount("-0.50")).toBe(expectedMask);
    expect(maskAmount(-1234.56)).toBe(expectedMask);
  });

  it("returns exactly '••••' for zero", () => {
    expect(maskAmount(0)).toBe(expectedMask);
    expect(maskAmount("0")).toBe(expectedMask);
    expect(maskAmount("0.00")).toBe(expectedMask);
  });

  it("returns exactly '••••' for very large numbers and long numeric strings", () => {
    expect(maskAmount(1e21)).toBe(expectedMask);
    expect(maskAmount(Number.MAX_SAFE_INTEGER)).toBe(expectedMask);
    expect(maskAmount("999999999999999999999999999999.99")).toBe(expectedMask);
  });

  it("returns exactly '••••' for empty string", () => {
    expect(maskAmount("")).toBe(expectedMask);
  });

  it("returns exactly '••••' for NaN and Infinity", () => {
    expect(maskAmount(NaN)).toBe(expectedMask);
    expect(maskAmount(Infinity)).toBe(expectedMask);
    expect(maskAmount(-Infinity)).toBe(expectedMask);
  });

  it("never contains any digit, '-', '.', or ',' from the input (property-style privacy check)", () => {
    const sampleInputs: (string | number)[] = [
      0,
      1,
      -5,
      12.3456789,
      "-0.50",
      "1,000,000.50",
      1e21,
      Number.MAX_SAFE_INTEGER,
      "9876543210",
      "-999.999",
      "",
      NaN,
      Infinity,
    ];

    const forbiddenChars = /[0-9.,-]/;

    for (const input of sampleInputs) {
      const masked = maskAmount(input);
      expect(masked).toBe(expectedMask);
      expect(forbiddenChars.test(masked)).toBe(false);
      // Constant length check: output length is strictly 4 across all inputs so magnitude is never leaked
      expect(masked.length).toBe(4);
    }
  });
});
