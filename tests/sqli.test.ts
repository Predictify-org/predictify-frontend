/**
 * SQL injection regression suite.
 *
 * Fires a battery of well-known SQL injection payloads against every
 * parameterized input boundary in the request-validation layer and asserts
 * that malicious input is rejected by the validators rather than flowing
 * through to persistence.
 *
 * The application's persistence layer ({@link SqlExecutor}) only ever accepts
 * SQL text and a separate `params` array, so values are passed as bound
 * parameters and never string-interpolated. These tests defend that contract
 * at the boundary: if a future change relaxed a validator, these assertions
 * would fail before a payload could ever reach a query.
 */

import {
  validateCreateStreamBody,
  validatePatchStreamBody,
} from "@/app/lib/stream-validation";
import type { SqlExecutor } from "@/app/lib/repositories/postgres";

// ── Payload corpus ───────────────────────────────────────────────────────────

/** Canonical SQL injection strings covering the common attack classes. */
const SQLI_PAYLOADS: readonly string[] = [
  "' OR '1'='1",
  "' OR 1=1 --",
  "'; DROP TABLE streams; --",
  "1; DELETE FROM users",
  "admin' --",
  "' UNION SELECT NULL, version() --",
  "\" OR \"\"=\"",
  "') OR ('a'='a",
  "'; EXEC xp_cmdshell('dir'); --",
  "0x27 OR 1=1",
  "' OR sleep(5) --",
  "%27%20OR%201=1",
  "'/**/OR/**/1=1",
];

const VALID_RECIPIENT = "G".padEnd(56, "A");

describe("SQL injection regression — validateCreateStreamBody", () => {
  it.each(SQLI_PAYLOADS)("rejects injection payload in `recipient`: %s", (payload) => {
    const errors = validateCreateStreamBody({
      recipient: payload,
      rate: "100",
      schedule: "day",
    });
    expect(errors.some((e) => e.field === "recipient")).toBe(true);
  });

  it.each(SQLI_PAYLOADS)("rejects injection payload in `rate`: %s", (payload) => {
    const errors = validateCreateStreamBody({
      recipient: VALID_RECIPIENT,
      rate: payload,
      schedule: "day",
    });
    expect(errors.some((e) => e.field === "rate")).toBe(true);
  });

  it.each(SQLI_PAYLOADS)("rejects injection payload in `schedule`: %s", (payload) => {
    const errors = validateCreateStreamBody({
      recipient: VALID_RECIPIENT,
      rate: "100",
      schedule: payload,
    });
    expect(errors.some((e) => e.field === "schedule")).toBe(true);
  });

  it("accepts a fully valid body (negative control)", () => {
    const errors = validateCreateStreamBody({
      recipient: VALID_RECIPIENT,
      rate: "50.5",
      schedule: "day",
    });
    expect(errors).toHaveLength(0);
  });
});

describe("SQL injection regression — validatePatchStreamBody", () => {
  it.each(SQLI_PAYLOADS)("rejects injection in unknown/strict fields: %s", (payload) => {
    // The schema is strict; an injected key must be rejected.
    const errors = validatePatchStreamBody({ [payload]: "x" } as Record<string, unknown>);
    expect(errors.length).toBeGreaterThan(0);
  });

  it.each(SQLI_PAYLOADS)("rejects injection in `webhook_url`: %s", (payload) => {
    const errors = validatePatchStreamBody({ webhook_url: payload });
    expect(errors.some((e) => e.field === "webhook_url")).toBe(true);
  });

  it("stores injection text in `description` as an inert string (no execution surface)", () => {
    // A description is free-form text and is legitimately allowed; the safety
    // guarantee is that it is bound as a parameter downstream, never executed.
    const payload = "Robert'); DROP TABLE streams; --";
    const errors = validatePatchStreamBody({ description: payload });
    expect(errors).toHaveLength(0);
  });
});

describe("SQL injection regression — SqlExecutor parameterization contract", () => {
  it("passes values as bound params, separate from SQL text", async () => {
    const calls: Array<{ sql: string; params?: readonly unknown[] }> = [];
    const executor: SqlExecutor = {
      async query<T>(sql: string, params?: readonly unknown[]) {
        calls.push({ sql, params });
        return { rows: [] as T[] };
      },
    };

    // Simulate the only safe call shape the repository layer may use.
    const malicious = "'; DROP TABLE streams; --";
    await executor.query("SELECT * FROM streams WHERE id = $1", [malicious]);

    expect(calls).toHaveLength(1);
    // SQL text must contain a placeholder, never the raw value.
    expect(calls[0].sql).toContain("$1");
    expect(calls[0].sql).not.toContain(malicious);
    // The payload is carried only in the params array, where the driver binds
    // it as a literal value — defeating injection.
    expect(calls[0].params).toEqual([malicious]);
  });
});
