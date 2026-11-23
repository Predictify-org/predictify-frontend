export type CreatorMarketStatus =
  | "open"
  | "cancelled"
  | "pending_resolution"
  | "resolved"
  | "failed";

export type DecimalAmount = string | number;

export interface CreatedMarket {
  id: string;
  title: string;
  status: CreatorMarketStatus;
  volume: DecimalAmount;
  feeBps: number;
  feesEarned: string;
  createdAt: string;
  deadline: string;
  hasBets?: boolean;
}

export type CreatorAction = "cancel_market" | "request_resolution";

export interface AllowedCreatorAction {
  allowed: boolean;
  reason: string | null;
}

export interface AllowedCreatorActions {
  cancelMarket: AllowedCreatorAction;
  requestResolution: AllowedCreatorAction;
}

const TOKEN_SCALE = 10_000_000n;

function toTokenUnits(amount: DecimalAmount): bigint {
  const value = String(amount).toLowerCase();
  const match = /^(0|[1-9]\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/.exec(value);
  if (!match) {
    throw new RangeError("Amount must be a non-negative decimal with at most 7 places.");
  }

  const fraction = match[2] ?? "";
  const exponent = Number(match[3] ?? 0);
  const decimalPlaces = fraction.length - exponent;
  const digits = `${match[1]}${fraction}`.replace(/^0+(?=\d)/, "");
  const unitsShift = 7 - decimalPlaces;
  if (unitsShift < 0 || !Number.isSafeInteger(exponent)) {
    throw new RangeError("Amount must have at most 7 decimal places.");
  }
  return BigInt(digits) * 10n ** BigInt(unitsShift);
}

function fromTokenUnits(units: bigint): string {
  const whole = units / TOKEN_SCALE;
  const fraction = (units % TOKEN_SCALE).toString().padStart(7, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function computeFeesEarned(volume: DecimalAmount, feeBps: number): string {
  if (!Number.isSafeInteger(feeBps) || feeBps < 0 || feeBps > 10_000) {
    throw new RangeError("Fee basis points must be an integer between 0 and 10000.");
  }
  return fromTokenUnits((toTokenUnits(volume) * BigInt(feeBps)) / 10_000n);
}

export function sumTokenAmounts(amounts: DecimalAmount[]): string {
  return fromTokenUnits(amounts.reduce((sum, amount) => sum + toTokenUnits(amount), 0n));
}

function allowed(available: boolean, reason: string): AllowedCreatorAction {
  return { allowed: available, reason: available ? null : reason };
}

export function getAllowedCreatorActions(
  market: CreatedMarket,
  now: number = Date.now()
): AllowedCreatorActions {
  const deadline = new Date(market.deadline).getTime();
  const isBeforeDeadline = Number.isFinite(deadline) && deadline > now;
  const hasBets = market.hasBets === true || toTokenUnits(market.volume) > 0n;
  const isUnresolved = market.status !== "resolved" && market.status !== "cancelled";
  const hasPassedDeadline = Number.isFinite(deadline) && deadline < now;

  const canCancel = market.status === "open" && !hasBets && isBeforeDeadline;
  const canRequestResolution =
    isUnresolved && market.status !== "pending_resolution" && hasPassedDeadline;

  return {
    cancelMarket: allowed(
      canCancel,
      market.status !== "open"
        ? "Only open markets can be cancelled."
        : hasBets
          ? "Markets cannot be cancelled after the first bet."
          : "Markets can only be cancelled before the deadline."
    ),
    requestResolution: allowed(
      canRequestResolution,
      market.status === "resolved"
        ? "This market is already resolved."
        : market.status === "cancelled"
          ? "Cancelled markets cannot be resolved."
          : market.status === "pending_resolution"
            ? "Resolution has already been requested."
            : "Resolution can only be requested after the deadline."
    ),
  };
}
