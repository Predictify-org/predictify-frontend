/**
 * Unit tests for the single-stream route handler:
 * - `PATCH /api/v2/streams/[id]`
 */

import { PATCH } from "./route";
import { getStore, resetDb } from "@/app/lib/db";
import { Stream } from "@/app/types/openapi";

const MOCK_STREAM_ID = "stream_mock_123";

function createMockRequest(body: unknown): Request {
  return new Request(`http://localhost/api/v2/streams/${MOCK_STREAM_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body === null ? null : JSON.stringify(body),
  });
}

describe("PATCH /api/v2/streams/[id]", () => {
  beforeEach(() => {
    resetDb();
    // Seed the store with a stream to update
    const { streams } = getStore();
    streams.set(MOCK_STREAM_ID, {
      id: MOCK_STREAM_ID,
      status: "active",
      recipient: "GABC...",
      // other fields...
    } as Stream);
  });

  it("returns 404 if the stream does not exist", async () => {
    const request = createMockRequest({ description: "test" });
    const response = await PATCH(request, { params: { id: "non-existent-id" } });
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for a request with invalid JSON", async () => {
    const request = new Request(`http://localhost/api/v2/streams/${MOCK_STREAM_ID}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{ not-valid-json }",
    });
    const response = await PATCH(request, { params: { id: MOCK_STREAM_ID } });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 for a request with unknown fields", async () => {
    const request = createMockRequest({
      description: "Valid description",
      unknown_field: "should be rejected",
    });
    const response = await PATCH(request, { params: { id: MOCK_STREAM_ID } });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0].code).toBe("UNRECOGNIZED_KEYS");
  });

  it("returns 422 for a request with invalid known fields", async () => {
    const request = createMockRequest({
      webhook_url: "not-a-url",
    });
    const response = await PATCH(request, { params: { id: MOCK_STREAM_ID } });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0].field).toBe("webhook_url");
  });

  it("successfully updates a stream with a valid partial payload", async () => {
    const updatePayload = { description: "A new description" };
    const request = createMockRequest(updatePayload);
    const response = await PATCH(request, { params: { id: MOCK_STREAM_ID } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.id).toBe(MOCK_STREAM_ID);
    expect(body.data.description).toBe("A new description");
    expect(body.data.updatedAt).toBeDefined();

    // Verify the store was updated
    const storedStream = getStore().streams.get(MOCK_STREAM_ID);
    expect(storedStream?.description).toBe("A new description");
  });

  it("successfully updates a stream with all valid fields", async () => {
    const updatePayload = {
      description: "Full update",
      webhook_url: "https://my-webhook.com/hook",
      tags: ["finance", "payroll"],
    };
    const request = createMockRequest(updatePayload);
    const response = await PATCH(request, { params: { id: MOCK_STREAM_ID } });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.description).toBe(updatePayload.description);
    expect(body.data.webhook_url).toBe(updatePayload.webhook_url);
    expect(body.data.tags).toEqual(updatePayload.tags);
  });

  it("successfully processes an empty payload", async () => {
    const request = createMockRequest({});
    const response = await PATCH(request, { params: { id: MOCK_STREAM_ID } });
    expect(response.status).toBe(200);
  });
});