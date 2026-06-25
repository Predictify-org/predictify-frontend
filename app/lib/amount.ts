export const STROOPS_SCALE = 10_000_000n;
export const STELLAR_MAX_I64 = 9_223_372_036_854_775_807n;

export const SUPPORTED_ASSETS = ["XLM", "USDC"] as const;
export type SupportedAsset = (typeof SUPPORTED_ASSETS)[number];

export type ValidationError = {
  code:
    | "INVALID_AMOUNT_FORMAT"
    | "NEGATIVE_AMOUNT"
    | "DECIMAL_PRECISION_EXCEEDED"
    | "SUB_OPERATION_PRECISION"
    | "AMOUNT_OVERFLOW"
    | "UNSUPPORTED_ASSET"
    | "INVALID_DURATION"
    | "NEGATIVE_RATE";
  httpStatus: 400 | 422;
  message: string;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { error: ValidationError; ok: false };

export type StreamInterval = "day" | "week" | "month";

const INTERVAL_SECONDS: Record<StreamInterval, bigint> = {
  day: 86_400n,
  month: 2_592_000n,
  week: 604_800n,
};

const AMOUNT_PATTERN = /^\d+(?:\.\d+)?$/;

function validationError(
  httpStatus: ValidationError["httpStatus"],
  code: ValidationError["code"],
  message: string,
): ValidationResult<never> {
  return { error: { code, httpStatus, message }, ok: false };
}

function normalizeInput(input: string): string {
  return input.trim();
}

function isSupportedAsset(asset: string): asset is SupportedAsset {
  return SUPPORTED_ASSETS.includes(asset as SupportedAsset);
}

function normalizeDecimalString(stroops: bigint): string {
  const whole = stroops / STROOPS_SCALE;
  const fraction = (stroops % STROOPS_SCALE).toString().padStart(7, "0").replace(/0+$/, "");

  if (fraction.length === 0) {
    return whole.toString();
  }

  return `${whole.toString()}.${fraction}`;
}

export class Amount {
  private constructor(
    public readonly asset: SupportedAsset,
    public readonly stroops: bigint,
  ) {}

  static parse(input: string, asset: string): ValidationResult<Amount> {
    if (!isSupportedAsset(asset)) {
      return validationError(
        422,
        "UNSUPPORTED_ASSET",
        `Unsupported asset \"${asset}\". Supported assets: ${SUPPORTED_ASSETS.join(", ")}.`,
      );
    }

    const normalized = normalizeInput(input);

    if (normalized.startsWith("-")) {
      return validationError(422, "NEGATIVE_AMOUNT", "Amount must be zero or greater.");
    }

    if (!AMOUNT_PATTERN.test(normalized)) {
      return validationError(400, "INVALID_AMOUNT_FORMAT", "Amount must be a plain decimal value.");
    }

    const [wholePart, fractionPart = ""] = normalized.split(".");

    if (fractionPart.length > 7) {
      return validationError(422, "DECIMAL_PRECISION_EXCEEDED", "Amount supports at most 7 decimal places.");
    }

    const whole = BigInt(wholePart);
    const paddedFraction = `${fractionPart}0000000`.slice(0, 7);
    const fraction = BigInt(paddedFraction);

    const stroops = whole * STROOPS_SCALE + fraction;

    if (stroops > STELLAR_MAX_I64) {
      return validationError(422, "AMOUNT_OVERFLOW", "Amount exceeds Stellar int64 bounds.");
    }

    return { ok: true, value: new Amount(asset, stroops) };
  }

  static fromStroops(stroops: bigint, asset: SupportedAsset): ValidationResult<Amount> {
    if (stroops < 0n) {
      return validationError(422, "NEGATIVE_AMOUNT", "Amount must be zero or greater.");
    }

    if (stroops > STELLAR_MAX_I64) {
      return validationError(422, "AMOUNT_OVERFLOW", "Amount exceeds Stellar int64 bounds.");
    }

    return { ok: true, value: new Amount(asset, stroops) };
  }

  toDecimalString(): string {
    return normalizeDecimalString(this.stroops);
  }
}

export type StreamRate = {
  amount: Amount;
  interval: StreamInterval;
};

export function createRate(
  amountInput: string,
  asset: string,
  interval: StreamInterval,
): ValidationResult<StreamRate> {
  const amountResult = Amount.parse(amountInput, asset);

  if (!amountResult.ok) {
    return amountResult;
  }

  return {
    ok: true,
    value: {
      amount: amountResult.value,
      interval,
    },
  };
}

export function formatRate(rate: StreamRate): string {
  return `${rate.amount.toDecimalString()} ${rate.amount.asset} / ${rate.interval}`;
}

export function deriveEscrowTotal(
  rate: StreamRate,
  durationSeconds: bigint,
): ValidationResult<Amount> {
  if (durationSeconds < 0n) {
    return validationError(422, "INVALID_DURATION", "Duration must be zero or greater.");
  }

  const denominator = INTERVAL_SECONDS[rate.interval];
  const numerator = rate.amount.stroops * durationSeconds;

  if (numerator > STELLAR_MAX_I64 * denominator) {
    return validationError(422, "AMOUNT_OVERFLOW", "Escrow total exceeds Stellar int64 bounds.");
  }

  if (numerator % denominator !== 0n) {
    return validationError(
      422,
      "SUB_OPERATION_PRECISION",
      "Duration produces fractional stroops and cannot be represented exactly.",
    );
  }

  const stroops = numerator / denominator;
  return Amount.fromStroops(stroops, rate.amount.asset);
}

export function parseDurationSeconds(input: string): ValidationResult<bigint> {
  const normalized = normalizeInput(input);

  if (!/^\d+$/.test(normalized)) {
    return validationError(400, "INVALID_DURATION", "Duration must be a whole number of seconds.");
  }

  const value = BigInt(normalized);

  if (value > STELLAR_MAX_I64) {
    return validationError(422, "AMOUNT_OVERFLOW", "Duration exceeds supported bounds.");
  }

  return { ok: true, value };
}
