import { db } from "@/app/lib/db";
import { POST as createExport } from "./route";
import { GET as getExport } from "./[id]/route";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Exports API", () => {
  beforeEach(() => {
    db.exportJobs.clear();
    db.exportAudit.length = 0;
    db.exportProcessing.clear();
    db.streams.clear();
    db.activity.clear();
  });

  it("creates a pending export job and later returns ready status", async () => {
    db.streams.set("stream-1", {
      id: "stream-1",
      recipient: "Test Recipient",
      rate: "10 XLM / month",
      schedule: "Monthly",
      status: "active",
      nextAction: "pause",
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-01T00:00:00Z",
    });
    db.activity.set("event-1", {
      id: "event-1",
      type: "stream.created",
      streamId: "stream-1",
      timestamp: "2026-04-01T00:01:00Z",
      description: "Stream created.",
    });

    const response = await createExport();
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.data).toMatchObject({ status: "pending" });
    expect(typeof json.data.id).toBe("string");

    await wait(200);

    const statusResponse = await getExport(new Request(`http://localhost/api/exports/${json.data.id}`), {
      params: Promise.resolve({ id: json.data.id }),
    });

    expect(statusResponse.status).toBe(200);
    const statusJson = await statusResponse.json();
    expect(statusJson.data.status).toBe("ready");
    expect(statusJson.data.signedUrl).toMatch(/^https:\/\//);
    expect(db.exportAudit.some((record) => record.type === "export.requested" && record.exportId === json.data.id)).toBe(true);
  });

  it("produces an empty export when no history exists", async () => {
    const response = await createExport();
    expect(response.status).toBe(201);

    const json = await response.json();
    await wait(200);

    const statusResponse = await getExport(new Request(`http://localhost/api/exports/${json.data.id}`), {
      params: Promise.resolve({ id: json.data.id }),
    });
    const statusJson = await statusResponse.json();
    expect(statusJson.data.status).toBe("ready");
    expect(statusJson.data.rows).toBe(0);
  });

  it("handles large export generation with more than 10k rows", async () => {
    for (let i = 0; i < 10005; i += 1) {
      db.activity.set(`event-${i}`, {
        id: `event-${i}`,
        type: "stream.settled",
        streamId: `stream-${i % 10}`,
        timestamp: new Date(2026, 3, 1, 0, i % 60, 0).toISOString(),
        description: `Payout event #${i}`,
      });
    }

    const response = await createExport();
    expect(response.status).toBe(201);
    const json = await response.json();
    await wait(400);

    const statusResponse = await getExport(new Request(`http://localhost/api/exports/${json.data.id}`), {
      params: Promise.resolve({ id: json.data.id }),
    });
    const statusJson = await statusResponse.json();

    expect(statusJson.data.status).toBe("ready");
    expect(statusJson.data.rows).toBeGreaterThanOrEqual(10005);
  });

  it("records download audit events when signed URL is requested", async () => {
    db.streams.set("stream-1", {
      id: "stream-1",
      recipient: "Test Recipient",
      rate: "10 XLM / month",
      schedule: "Monthly",
      status: "active",
      nextAction: "pause",
      createdAt: "2026-04-01T00:00:00Z",
      updatedAt: "2026-04-01T00:00:00Z",
    });

    const response = await createExport();
    const json = await response.json();
    await wait(200);

    const downloadResponse = await getExport(new Request(`http://localhost/api/exports/${json.data.id}?download=true`), {
      params: Promise.resolve({ id: json.data.id }),
    });
    expect(downloadResponse.status).toBe(200);

    expect(db.exportAudit.some((record) => record.type === "export.downloaded" && record.exportId === json.data.id)).toBe(true);
  });
});
