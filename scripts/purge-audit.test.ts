/** @jest-environment node */

import { cutoffFor, parsePurgeArgs, runPurgeCli } from "./purge-audit";

describe("purge-audit CLI", () => {
  it("parses dry-run arguments", () => {
    const options = parsePurgeArgs([
      "--older-than-days",
      "2555",
      "--now",
      "2026-06-27T00:00:00.000Z",
      "--request-id",
      "req-cli",
    ]);

    expect(options.execute).toBe(false);
    expect(options.olderThanDays).toBe(2555);
    expect(options.requestId).toBe("req-cli");
  });

  it("computes ISO cutoff timestamps", () => {
    expect(
      cutoffFor({
        now: new Date("2026-06-27T00:00:00.000Z"),
        olderThanDays: 10,
      }),
    ).toBe("2026-06-17T00:00:00.000Z");
  });

  it("returns a standard error envelope for invalid input", () => {
    const lines: string[] = [];
    const exitCode = runPurgeCli([], { error: (line) => lines.push(line), log: jest.fn() });

    expect(exitCode).toBe(1);
    expect(JSON.parse(lines[0]).error).toMatchObject({
      code: "INVALID_ARGUMENTS",
      request_id: "audit-purge-argument-error",
    });
  });
});
