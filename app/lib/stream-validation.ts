/**
 * Stream Validation Module
 *
 * Shared request-body validation for POST /api/streams handlers (v1 & v2).
 * Ensures recipient, rate, and schedule meet Stellar network requirements
 * before the stream is persisted.
 *
 * All validators return structured error arrays so the calling route can
 * return 422 VALIDATION_ERROR with per-field details.
 */

import { isValidStellarPublicKey } from "@/app/lib/wallet-link";

// ── Constants ──────────────────────────────────────────────────────────────

/**
 * Schedule values supported by the schedule engine.
 * @see app/lib/schedules.ts — PayoutInterval type
 */
export const SUPPORTED_SCHEDULES = [
  "second",
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "year",
] as const;

export type SupportedSchedule = (typeof SUPPORTED_SCHEDULES)[number];

/** Maximum decimal places allowed for rate (Stellar supports 7). */
const MAX_DECIMAL_PRECISION = 7;

/** Regex for a non-negative decimal number (whole or fractional). */
const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/;

// ── Types ──────────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface CreateStreamBody {
  recipient: string;
  rate: string;
  schedule: string;
  token?: string;
}

// ── Validator ──────────────────────────────────────────────────────────────

/**
 * Validates the request body for POST /api/streams.
 *
 * Returns an array of field-level errors. An empty array means the body is
 * valid (though the caller still needs to handle token allowlisting etc.).
 */
export function validateCreateStreamBody(
  body: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // ── recipient ────────────────────────────────────────────────────────────
  const recipient = body.recipient;
  if (typeof recipient !== "string" || recipient.trim().length === 0) {
    errors.push({
      field: "recipient",
      code: "MISSING_FIELD",
      message: "recipient is required and must be a non-empty string.",
    });
  } else if (!isValidStellarPublicKey(recipient.trim())) {
    errors.push({
      field: "recipient",
      code: "INVALID_STELLAR_KEY",
      message:
        "recipient must be a valid Stellar public key (56-char string starting with G).",
    });
  }

  // ── rate ─────────────────────────────────────────────────────────────────
  const rate = body.rate;
  if (typeof rate !== "string" || rate.trim().length === 0) {
    errors.push({
      field: "rate",
      code: "MISSING_FIELD",
      message: "rate is required and must be a non-empty string.",
    });
  } else {
    const trimmed = rate.trim();

    if (!DECIMAL_PATTERN.test(trimmed)) {
      errors.push({
        field: "rate",
        code: "INVALID_RATE_FORMAT",
        message: "rate must be a positive decimal number (e.g. 100 or 50.5).",
      });
    } else {
      const numericValue = Number(trimmed);

      if (numericValue <= 0) {
        errors.push({
          field: "rate",
          code: "NEGATIVE_RATE",
          message: "rate must be greater than zero.",
        });
      }

      const fractionPart = trimmed.split(".")[1] ?? "";
      if (fractionPart.length > MAX_DECIMAL_PRECISION) {
        errors.push({
          field: "rate",
          code: "DECIMAL_PRECISION_EXCEEDED",
          message: `rate supports at most ${MAX_DECIMAL_PRECISION} decimal places.`,
        });
      }
    }
  }

  // ── schedule ─────────────────────────────────────────────────────────────
  const schedule = body.schedule;
  if (typeof schedule !== "string" || schedule.trim().length === 0) {
    errors.push({
      field: "schedule",
      code: "MISSING_FIELD",
      message: "schedule is required and must be a non-empty string.",
    });
  } else {
    const normalized = schedule.trim().toLowerCase();
    if (!SUPPORTED_SCHEDULES.includes(normalized as SupportedSchedule)) {
      errors.push({
        field: "schedule",
        code: "INVALID_SCHEDULE",
        message: `schedule must be one of: ${SUPPORTED_SCHEDULES.join(", ")}.`,
      });
    }
  }

  // ── token (optional) ─────────────────────────────────────────────────────
  const token = body.token;
  if (token !== undefined && token !== null && typeof token !== "string") {
    errors.push({
      field: "token",
      code: "INVALID_TOKEN_FORMAT",
      message: "token must be a string if provided.",
    });
  }

  return errors;
}
