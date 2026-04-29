import {
  Amount,
  STELLAR_MAX_I64,
  STROOPS_SCALE,
  createRate,
  deriveEscrowTotal,
  formatRate,
  parseDurationSeconds,
} from "./amount";

describe("Amount.parse", () => {
  it.each([
    ["0", "0", 0n],
    ["1", "1", STROOPS_SCALE],
    ["1.0", "1", STROOPS_SCALE],
    ["1.0000000", "1", STROOPS_SCALE],
    ["1.0000001", "1.0000001", STROOPS_SCALE + 1n],
    ["120", "120", 1_200_000_000n],
    ["0.1", "0.1", 1_000_000n],
    ["0.01", "0.01", 100_000n],
    ["0.001", "0.001", 10_000n],
    ["0.0001", "0.0001", 1_000n],
    ["0.00001", "0.00001", 100n],
    ["0.000001", "0.000001", 10n],
    ["0.0000001", "0.0000001", 1n],
    ["999999999.9999999", "999999999.9999999", 9_999_999_999_999_999n],
    ["922337203685.4775807", "922337203685.4775807", STELLAR_MAX_I64],
    ["   5.2", "5.2", 52_000_000n],
    ["5.2000000   ", "5.2", 52_000_000n],
    ["0005.2000000", "5.2", 52_000_000n],
  ])("accepts %s", (input, expectedDisplay, expectedStroops) => {
    const result = Amount.parse(input, "XLM");

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.toDecimalString()).toBe(expectedDisplay);
      expect(result.value.stroops).toBe(expectedStroops);
    }
  });

  it.each([
    ["", "INVALID_AMOUNT_FORMAT", 400],
    [" ", "INVALID_AMOUNT_FORMAT", 400],
    [".", "INVALID_AMOUNT_FORMAT", 400],
    ["1.", "INVALID_AMOUNT_FORMAT", 400],
    [".1", "INVALID_AMOUNT_FORMAT", 400],
    ["+1", "INVALID_AMOUNT_FORMAT", 400],
    ["-1", "NEGATIVE_AMOUNT", 422],
    ["-0.0000001", "NEGATIVE_AMOUNT", 422],
    ["1e3", "INVALID_AMOUNT_FORMAT", 400],
    ["1E3", "INVALID_AMOUNT_FORMAT", 400],
    ["Infinity", "INVALID_AMOUNT_FORMAT", 400],
    ["NaN", "INVALID_AMOUNT_FORMAT", 400],
    ["1,000", "INVALID_AMOUNT_FORMAT", 400],
    ["1_000", "INVALID_AMOUNT_FORMAT", 400],
    ["abc", "INVALID_AMOUNT_FORMAT", 400],
    ["1abc", "INVALID_AMOUNT_FORMAT", 400],
    ["1.12345678", "DECIMAL_PRECISION_EXCEEDED", 422],
    ["0.00000001", "DECIMAL_PRECISION_EXCEEDED", 422],
    ["922337203685.4775808", "AMOUNT_OVERFLOW", 422],
    ["1000000000000", "AMOUNT_OVERFLOW", 422],
    ["0x10", "INVALID_AMOUNT_FORMAT", 400],
    ["1 2", "INVALID_AMOUNT_FORMAT", 400],
    ["1..2", "INVALID_AMOUNT_FORMAT", 400],
    ["--1", "NEGATIVE_AMOUNT", 422],
    ["-", "NEGATIVE_AMOUNT", 422],
    ["  -1", "NEGATIVE_AMOUNT", 422],
  ])("rejects malformed input %s", (input, expectedCode, expectedStatus) => {
    const result = Amount.parse(input, "XLM");

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe(expectedCode);
      expect(result.error.httpStatus).toBe(expectedStatus);
    }
  });

  it("rejects unsupported assets with 422", () => {
    const result = Amount.parse("1", "BTC");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNSUPPORTED_ASSET");
      expect(result.error.httpStatus).toBe(422);
    }
  });

  it("validates fromStroops bounds", () => {
    const negative = Amount.fromStroops(-1n, "XLM");
    expect(negative.ok).toBe(false);
    if (!negative.ok) {
      expect(negative.error.code).toBe("NEGATIVE_AMOUNT");
      expect(negative.error.httpStatus).toBe(422);
    }

    const overflow = Amount.fromStroops(STELLAR_MAX_I64 + 1n, "XLM");
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) {
      expect(overflow.error.code).toBe("AMOUNT_OVERFLOW");
      expect(overflow.error.httpStatus).toBe(422);
    }

    const valid = Amount.fromStroops(42n, "USDC");
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.toDecimalString()).toBe("0.0000042");
    }
  });
});

describe("Rate and escrow math", () => {
  it("formats accepted rates", () => {
    const rate = createRate("32", "XLM", "week");

    expect(rate.ok).toBe(true);
    if (rate.ok) {
      expect(formatRate(rate.value)).toBe("32 XLM / week");
    }
  });

  it.each([
    ["1", "month", "2592000", "1"],
    ["32", "week", "604800", "32"],
    ["18", "day", "86400", "18"],
    ["0.0000001", "day", "86400", "0.0000001"],
    ["120", "month", "7776000", "360"],
    ["2.5", "day", "172800", "5"],
  ] as const)(
    "derives escrow for rate=%s interval=%s duration=%s",
    (amount, interval, duration, expectedTotal) => {
      const rate = createRate(amount, "XLM", interval);
      expect(rate.ok).toBe(true);

      if (!rate.ok) {
        return;
      }

      const total = deriveEscrowTotal(rate.value, BigInt(duration));
      expect(total.ok).toBe(true);

      if (total.ok) {
        expect(total.value.toDecimalString()).toBe(expectedTotal);
      }
    },
  );

  it("rejects sub-operation precision", () => {
    const rate = createRate("1", "XLM", "day");
    expect(rate.ok).toBe(true);

    if (!rate.ok) {
      return;
    }

    const total = deriveEscrowTotal(rate.value, 1n);
    expect(total.ok).toBe(false);

    if (!total.ok) {
      expect(total.error.code).toBe("SUB_OPERATION_PRECISION");
      expect(total.error.httpStatus).toBe(422);
    }
  });

  it("rejects negative duration with 422", () => {
    const rate = createRate("1", "XLM", "day");
    expect(rate.ok).toBe(true);

    if (!rate.ok) {
      return;
    }

    const total = deriveEscrowTotal(rate.value, -1n);
    expect(total.ok).toBe(false);

    if (!total.ok) {
      expect(total.error.code).toBe("INVALID_DURATION");
      expect(total.error.httpStatus).toBe(422);
    }
  });

  it("rejects overflow in intermediate escrow math", () => {
    const rate = createRate("922337203685.4775807", "XLM", "day");
    expect(rate.ok).toBe(true);

    if (!rate.ok) {
      return;
    }

    const total = deriveEscrowTotal(rate.value, 86_401n);
    expect(total.ok).toBe(false);

    if (!total.ok) {
      expect(total.error.code).toBe("AMOUNT_OVERFLOW");
      expect(total.error.httpStatus).toBe(422);
    }
  });
});

describe("Duration parsing", () => {
  it.each([
    ["0", 0n],
    ["1", 1n],
    ["86400", 86_400n],
    ["9223372036854775807", STELLAR_MAX_I64],
  ])("parses duration %s", (input, expected) => {
    const result = parseDurationSeconds(input);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toBe(expected);
    }
  });

  it.each([
    ["", "INVALID_DURATION", 400],
    [" ", "INVALID_DURATION", 400],
    ["1.2", "INVALID_DURATION", 400],
    ["-1", "INVALID_DURATION", 400],
    ["1e3", "INVALID_DURATION", 400],
    ["abc", "INVALID_DURATION", 400],
    ["9223372036854775808", "AMOUNT_OVERFLOW", 422],
  ])("rejects duration %s", (input, code, status) => {
    const result = parseDurationSeconds(input);
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe(code);
      expect(result.error.httpStatus).toBe(status);
    }
  });
});

function makeSeededRng(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 0x100000000;
  };
}

function referenceToStroops(input: string): bigint {
  const [wholePart, fractionPart = ""] = input.split(".");
  const whole = BigInt(wholePart) * STROOPS_SCALE;
  const paddedFraction = `${fractionPart}0000000`.slice(0, 7);
  return whole + BigInt(paddedFraction);
}

describe("Fuzz-style bounded checks", () => {
  it("cross-checks parser against a reference implementation for safe-range decimals", () => {
    const rng = makeSeededRng(1337);

    for (let i = 0; i < 300; i += 1) {
      const whole = Math.floor(rng() * 100_000);
      const fraction = Math.floor(rng() * 1_000).toString().padStart(3, "0");
      const input = `${whole}.${fraction}`;

      const parsed = Amount.parse(input, "XLM");
      expect(parsed.ok).toBe(true);

      if (!parsed.ok) {
        continue;
      }

      const reference = referenceToStroops(input);
      expect(parsed.value.stroops).toBe(reference);
    }
  });

  it("fuzzes escrow totals without throwing for malformed and random values", () => {
    const rng = makeSeededRng(4040);

    const malformedInputs = ["-1", "", ".1", "1.00000001", "1e3", "abc", "922337203686"];
    for (const malformed of malformedInputs) {
      const malformedRate = createRate(malformed, "XLM", "day");
      expect(malformedRate.ok).toBe(false);
      if (!malformedRate.ok) {
        expect([400, 422]).toContain(malformedRate.error.httpStatus);
      }
    }

    for (let i = 0; i < 250; i += 1) {
      const whole = Math.floor(rng() * 10_000);
      const input = `${whole}`;
      const duration = BigInt(Math.floor(rng() * 86_400 * 10));

      const rate = createRate(input, "XLM", "day");
      expect(rate.ok).toBe(true);
      if (!rate.ok) {
        continue;
      }

      const total = deriveEscrowTotal(rate.value, duration);
      expect(typeof total.ok).toBe("boolean");

      if (!total.ok) {
        expect(["SUB_OPERATION_PRECISION", "AMOUNT_OVERFLOW", "INVALID_DURATION"]).toContain(total.error.code);
        expect([400, 422]).toContain(total.error.httpStatus);
      }
    }
  });
});
