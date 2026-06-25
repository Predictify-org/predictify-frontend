/**
 * Tests for app/lib/stream-validation.ts
 *
 * Covers all validation scenarios for POST /api/streams body fields:
 * recipient, rate, schedule, and optional token.
 */

import {
  validateCreateStreamBody,
  SUPPORTED_SCHEDULES,
} from "./stream-validation";

const VALID_STELLAR_KEY = "GDSBCG3OKHCMMWS5EBH2X7XOYTJRWXN2YYQPCNS5OFBU4IDO4X7OFSQA";

// ── Happy path ─────────────────────────────────────────────────────────────

describe("validateCreateStreamBody", () => {
  it("returns no errors for a valid body with all required fields", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: "month",
    });
    expect(errors).toHaveLength(0);
  });

  it("accepts rate with decimal places", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "50.5",
      schedule: "day",
    });
    expect(errors).toHaveLength(0);
  });

  it("accepts rate with 7 decimal places (Stellar max)", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "1.1234567",
      schedule: "hour",
    });
    expect(errors).toHaveLength(0);
  });

  it("accepts all supported schedules", () => {
    for (const schedule of SUPPORTED_SCHEDULES) {
      const errors = validateCreateStreamBody({
        recipient: VALID_STELLAR_KEY,
        rate: "100",
        schedule,
      });
      expect(errors).toHaveLength(0);
    }
  });

  it("accepts optional token field", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: "week",
      token: "USDC",
    });
    expect(errors).toHaveLength(0);
  });

  // ── recipient errors ─────────────────────────────────────────────────────

  it("returns error when recipient is missing", () => {
    const errors = validateCreateStreamBody({
      rate: "100",
      schedule: "month",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("recipient");
    expect(errors[0].code).toBe("MISSING_FIELD");
  });

  it("returns error when recipient is not a string", () => {
    const errors = validateCreateStreamBody({
      recipient: 123,
      rate: "100",
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "recipient",
          code: "MISSING_FIELD",
        }),
      ]),
    );
  });

  it("returns error when recipient is empty string", () => {
    const errors = validateCreateStreamBody({
      recipient: "",
      rate: "100",
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "recipient",
          code: "MISSING_FIELD",
        }),
      ]),
    );
  });

  it("returns error when recipient is not a valid Stellar key", () => {
    const errors = validateCreateStreamBody({
      recipient: "GABC123",
      rate: "100",
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "recipient",
          code: "INVALID_STELLAR_KEY",
        }),
      ]),
    );
  });

  it("returns error when recipient is a short string", () => {
    const errors = validateCreateStreamBody({
      recipient: "not-a-valid-key",
      rate: "100",
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "recipient",
          code: "INVALID_STELLAR_KEY",
        }),
      ]),
    );
  });

  // ── rate errors ──────────────────────────────────────────────────────────

  it("returns error when rate is missing", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      schedule: "month",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("rate");
    expect(errors[0].code).toBe("MISSING_FIELD");
  });

  it("returns error when rate is not a string", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: 100,
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "rate", code: "MISSING_FIELD" }),
      ]),
    );
  });

  it("returns error when rate is empty string", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "",
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "rate", code: "MISSING_FIELD" }),
      ]),
    );
  });

  it("returns error when rate is zero", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "0",
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "rate", code: "NEGATIVE_RATE" }),
      ]),
    );
  });

  it("returns error when rate is negative", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "-50",
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "rate", code: "INVALID_RATE_FORMAT" }),
      ]),
    );
  });

  it("returns error when rate has too many decimal places", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "1.12345678",
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "rate",
          code: "DECIMAL_PRECISION_EXCEEDED",
        }),
      ]),
    );
  });

  it("returns error when rate is not a number", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "abc",
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "rate",
          code: "INVALID_RATE_FORMAT",
        }),
      ]),
    );
  });

  it("returns error when rate has multiple decimal points", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "50.5.5",
      schedule: "month",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "rate",
          code: "INVALID_RATE_FORMAT",
        }),
      ]),
    );
  });

  // ── schedule errors ──────────────────────────────────────────────────────

  it("returns error when schedule is missing", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe("schedule");
    expect(errors[0].code).toBe("MISSING_FIELD");
  });

  it("returns error when schedule is not a string", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: 123,
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "schedule",
          code: "MISSING_FIELD",
        }),
      ]),
    );
  });

  it("returns error when schedule is empty string", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: "",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "schedule",
          code: "MISSING_FIELD",
        }),
      ]),
    );
  });

  it("returns error when schedule is not in supported set", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: "daily",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "schedule",
          code: "INVALID_SCHEDULE",
        }),
      ]),
    );
  });

  it("returns error for unknown schedule value", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: "30 days",
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "schedule",
          code: "INVALID_SCHEDULE",
        }),
      ]),
    );
  });

  // ── token errors ─────────────────────────────────────────────────────────

  it("returns error when token is not a string", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: "month",
      token: 123,
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "token",
          code: "INVALID_TOKEN_FORMAT",
        }),
      ]),
    );
  });

  it("allows token to be null (will default to XLM)", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: "month",
      token: null,
    });
    // null is explicitly allowed — route defaults to XLM
    const tokenErrors = errors.filter((e) => e.field === "token");
    expect(tokenErrors).toHaveLength(0);
  });

  it("allows token to be undefined", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: "month",
    });
    const tokenErrors = errors.filter((e) => e.field === "token");
    expect(tokenErrors).toHaveLength(0);
  });

  // ── multiple errors ──────────────────────────────────────────────────────

  it("returns multiple errors when multiple fields are invalid", () => {
    const errors = validateCreateStreamBody({});
    expect(errors.length).toBeGreaterThanOrEqual(3);
    const fields = errors.map((e) => e.field);
    expect(fields).toContain("recipient");
    expect(fields).toContain("rate");
    expect(fields).toContain("schedule");
  });

  it("returns multiple field-level errors from different fields", () => {
    const errors = validateCreateStreamBody({
      recipient: "not-a-key",
      rate: "0",
      schedule: "unknown",
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
    const fields = errors.map((e) => e.field);
    expect(fields).toContain("recipient");
    expect(fields).toContain("rate");
    expect(fields).toContain("schedule");
    const rateErrors = errors.filter((e) => e.field === "rate");
    expect(rateErrors.length).toBeGreaterThanOrEqual(1);
    expect(rateErrors[0].code).toBe("NEGATIVE_RATE");
  });

  // ── whitespace handling ──────────────────────────────────────────────────

  it("trims whitespace from recipient before validating", () => {
    const errors = validateCreateStreamBody({
      recipient: `  ${VALID_STELLAR_KEY}  `,
      rate: "100",
      schedule: "month",
    });
    expect(errors).toHaveLength(0);
  });

  it("trims whitespace from schedule before validating", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: "  month  ",
    });
    expect(errors).toHaveLength(0);
  });

  it("schedule is case-insensitive", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_STELLAR_KEY,
      rate: "100",
      schedule: "MONTH",
    });
    expect(errors).toHaveLength(0);
  });
});
