import { toV2Stream, type StreamV1, type StreamV2 } from "./api-version";

const baseV1: StreamV1 = {
  id: "stream_001",
  recipient: "GABC123",
  rate: "120 XLM/month",
  status: "active",
  actions: ["pause", "stop"],
  createdAt: "2024-01-15T10:00:00.000Z",
};

describe("toV2Stream()", () => {
  it("maps v1 fields to v2 shape correctly", () => {
    const v2 = toV2Stream(baseV1);

    expect(v2.id).toBe(baseV1.id);
    expect(v2.recipient).toBe(baseV1.recipient);
    expect(v2.rate).toBe(baseV1.rate);
    expect(v2.status).toBe(baseV1.status);
  });

  it("renames 'actions' → 'allowed_actions'", () => {
    const v2 = toV2Stream(baseV1);
    expect(v2.allowed_actions).toEqual(["pause", "stop"]);
    expect((v2 as unknown as { actions?: unknown }).actions).toBeUndefined();
  });

  it("renames 'createdAt' → 'created_at'", () => {
    const v2 = toV2Stream(baseV1);
    expect(v2.created_at).toBe("2024-01-15T10:00:00.000Z");
    expect((v2 as unknown as { createdAt?: unknown }).createdAt).toBeUndefined();
  });

  it("sets settlement to null by default", () => {
    const v2 = toV2Stream(baseV1);
    expect(v2.settlement).toBeNull();
  });

  it("preserves all four status values", () => {
    const statuses: StreamV1["status"][] = ["draft", "active", "paused", "ended"];
    for (const status of statuses) {
      const v2 = toV2Stream({ ...baseV1, status });
      expect(v2.status).toBe(status);
    }
  });

  it("preserves an empty actions array", () => {
    const v2 = toV2Stream({ ...baseV1, actions: [] });
    expect(v2.allowed_actions).toEqual([]);
  });

  it("returns a plain object matching the StreamV2 interface", () => {
    const v2: StreamV2 = toV2Stream(baseV1);
    const keys = Object.keys(v2).sort();
    expect(keys).toEqual(
      ["allowed_actions", "created_at", "id", "rate", "recipient", "settlement", "status"].sort(),
    );
  });
});
