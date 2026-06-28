import { GET } from "./route";
import { db, resetDb } from "@/app/lib/db";
import { eventBus } from "@/app/lib/event-bus";
import jwt from "jsonwebtoken";

// Mock dependencies
jest.mock("../../../lib/logger");

const JWT_SECRET = process.env.JWT_SECRET || "streampay-dev-secret-do-not-use-in-prod";

describe("SSE Events API", () => {
  beforeEach(() => {
    // We need to import db correctly
    const { db: actualDb, resetDb: actualResetDb } = require("@/app/lib/db");
    actualResetDb();
  });

  it("returns 401 if no token is provided", async () => {
    const req = new Request("http://localhost/api/streams/events?streamId=stream-ada") as any;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 422 if streamId is missing", async () => {
    const token = jwt.sign({ iss: "streampay", aud: "streampay-api", sub: "GD7H...3J4K", role: "user" }, JWT_SECRET);
    const req = new Request("http://localhost/api/streams/events", {
      headers: { authorization: `Bearer ${token}` },
    }) as any;
    const res = await GET(req);
    expect(res.status).toBe(422);
  });

  it("returns 404 if stream does not exist", async () => {
    const token = jwt.sign({ iss: "streampay", aud: "streampay-api", sub: "GD7H...3J4K", role: "user" }, JWT_SECRET);
    const req = new Request("http://localhost/api/streams/events?streamId=invalid-id", {
      headers: { authorization: `Bearer ${token}` },
    }) as any;
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 if user does not own the stream", async () => {
    // stream-ada belongs to ada@creativestudio.io (GD7H...3J4K)
    // We'll use a different wallet address
    const token = jwt.sign({ iss: "streampay", aud: "streampay-api", sub: "OTHER_WALLET", role: "user" }, JWT_SECRET);
    const req = new Request("http://localhost/api/streams/events?streamId=stream-ada", {
      headers: { authorization: `Bearer ${token}` },
    }) as any;
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 and establishes SSE for authorized user", async () => {
    const token = jwt.sign({ iss: "streampay", aud: "streampay-api", sub: "GD7H...3J4K", role: "user" }, JWT_SECRET);
    const req = new Request("http://localhost/api/streams/events?streamId=stream-ada", {
      headers: { authorization: `Bearer ${token}` },
    }) as any;
    
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });
});
