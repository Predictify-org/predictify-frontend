/** @jest-environment node */

import { GET } from "./route";

describe("GET /api/healthz", () => {
  it("returns process liveness without dependency checks", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(new Date(body.checked_at).toString()).not.toBe("Invalid Date");
  });
});
