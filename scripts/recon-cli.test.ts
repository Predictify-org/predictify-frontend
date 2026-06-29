/** @jest-environment node */

import { parseReconArgs, runReconCli } from "./recon-cli";
import { ReconciliationService } from "./reconciliation/reconcile";

jest.mock("./reconciliation/reconcile");

const mockRunReconciliation = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (ReconciliationService as jest.MockedClass<typeof ReconciliationService>).mockImplementation(
    () =>
      ({
        runReconciliation: mockRunReconciliation,
      }) as unknown as ReconciliationService,
  );
});

describe("parseReconArgs", () => {
  it("parses --stream-id and defaults", () => {
    const opts = parseReconArgs(["--stream-id", "stream_123"]);
    expect(opts.streamId).toBe("stream_123");
    expect(opts.tolerance).toBe(0n);
    expect(opts.dryRun).toBe(false);
  });

  it("parses --tolerance and --dry-run", () => {
    const opts = parseReconArgs([
      "--stream-id",
      "s1",
      "--tolerance",
      "100",
      "--dry-run",
    ]);
    expect(opts.streamId).toBe("s1");
    expect(opts.tolerance).toBe(100n);
    expect(opts.dryRun).toBe(true);
  });

  it("parses --request-id", () => {
    const opts = parseReconArgs([
      "--stream-id",
      "s1",
      "--request-id",
      "my-req-001",
    ]);
    expect(opts.requestId).toBe("my-req-001");
  });

  it("throws if --stream-id is missing", () => {
    expect(() => parseReconArgs([])).toThrow("--stream-id is required");
  });

  it("throws if --stream-id is empty", () => {
    expect(() => parseReconArgs(["--stream-id", ""])).toThrow(
      "must be non-empty",
    );
  });

  it("throws if --tolerance is not a number", () => {
    expect(() =>
      parseReconArgs(["--stream-id", "s1", "--tolerance", "abc"]),
    ).toThrow("--tolerance must be a non-negative integer");
  });

  it("throws for unknown arguments", () => {
    expect(() =>
      parseReconArgs(["--stream-id", "s1", "--unknown"]),
    ).toThrow("Unknown argument");
  });

  it("throws and displays usage on --help", () => {
    expect(() => parseReconArgs(["--stream-id", "s1", "--help"])).toThrow(
      "Usage:",
    );
  });
});

describe("runReconCli", () => {
  it("returns 0 on SUCCESS", async () => {
    mockRunReconciliation.mockResolvedValue({
      timestamp: "2026-06-28T00:00:00.000Z",
      totalStreamsChecked: 1,
      mismatches: [],
      errors: [],
      status: "SUCCESS",
    });

    const lines: string[] = [];
    const code = await runReconCli(["--stream-id", "s1"], {
      error: jest.fn(),
      log: (line) => lines.push(line),
    });

    expect(code).toBe(0);
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.data.status).toBe("SUCCESS");
  });

  it("returns 1 on MISMATCH_FOUND", async () => {
    mockRunReconciliation.mockResolvedValue({
      timestamp: "2026-06-28T00:00:00.000Z",
      totalStreamsChecked: 1,
      mismatches: [
        {
          streamId: "s1",
          field: "total_amount",
          dbValue: "100",
          onChainValue: "200",
          toleranceApplied: false,
        },
      ],
      errors: [],
      status: "MISMATCH_FOUND",
    });

    const lines: string[] = [];
    const code = await runReconCli(["--stream-id", "s1"], {
      error: jest.fn(),
      log: (line) => lines.push(line),
    });

    expect(code).toBe(1);
  });

  it("returns 1 on FAILED", async () => {
    mockRunReconciliation.mockResolvedValue({
      timestamp: "2026-06-28T00:00:00.000Z",
      totalStreamsChecked: 0,
      mismatches: [],
      errors: [{ streamId: "s1", error: "Stream not found" }],
      status: "FAILED",
    });

    const lines: string[] = [];
    const code = await runReconCli(["--stream-id", "nonexistent"], {
      error: jest.fn(),
      log: (line) => lines.push(line),
    });

    expect(code).toBe(1);
  });

  it("returns 1 for invalid arguments", async () => {
    const errors: string[] = [];
    const code = await runReconCli([], {
      error: (line) => errors.push(line),
      log: jest.fn(),
    });

    expect(code).toBe(1);
    expect(errors.length).toBe(1);
    const parsed = JSON.parse(errors[0]);
    expect(parsed.error.code).toBe("INVALID_ARGUMENTS");
  });

  it("returns 1 if service throws", async () => {
    mockRunReconciliation.mockRejectedValue(new Error("Service Error"));

    const errors: string[] = [];
    const code = await runReconCli(["--stream-id", "s1"], {
      error: (line) => errors.push(line),
      log: jest.fn(),
    });

    expect(code).toBe(1);
    expect(errors.length).toBe(1);
    const parsed = JSON.parse(errors[0]);
    expect(parsed.error.code).toBe("RECONCILIATION_FAILED");
  });

  it("passes tolerance and dryRun to the service", async () => {
    mockRunReconciliation.mockResolvedValue({
      timestamp: "2026-06-28T00:00:00.000Z",
      totalStreamsChecked: 1,
      mismatches: [],
      errors: [],
      status: "SUCCESS",
    });

    await runReconCli(
      ["--stream-id", "s1", "--tolerance", "50", "--dry-run"],
      { error: jest.fn(), log: jest.fn() },
    );

    expect(ReconciliationService).toHaveBeenCalledWith({ tolerance: 50n });
    expect(mockRunReconciliation).toHaveBeenCalledWith({
      streamId: "s1",
      dryRun: true,
    });
  });
});
