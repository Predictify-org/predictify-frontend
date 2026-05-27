/** @jest-environment node */

import { GET } from "./route";
import { getReadinessReport } from "../../lib/health";

jest.mock("../../lib/health", () => ({
  getReadinessReport: jest.fn(),
}));

const mockedGetReadinessReport = getReadinessReport as jest.MockedFunction<typeof getReadinessReport>;

describe("GET /api/readyz", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("returns 200 when all readiness checks pass", async () => {
    mockedGetReadinessReport.mockResolvedValue({
      status: "ok",
      checks: {
        config: { status: "ok", checked_at: "2026-05-27T00:00:00.000Z" },
        stellar: { status: "ok", checked_at: "2026-05-27T00:00:00.000Z" },
        kms: { status: "ok", checked_at: "2026-05-27T00:00:00.000Z" },
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("returns 503 with per-dependency detail when a dependency is degraded", async () => {
    mockedGetReadinessReport.mockResolvedValue({
      status: "degraded",
      checks: {
        config: { status: "ok", checked_at: "2026-05-27T00:00:00.000Z" },
        stellar: {
          status: "degraded",
          message: "Horizon timeout",
          checked_at: "2026-05-27T00:00:00.000Z",
        },
        kms: { status: "ok", checked_at: "2026-05-27T00:00:00.000Z" },
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "degraded",
      checks: {
        stellar: { status: "degraded", message: "Horizon timeout" },
      },
    });
  });
});
