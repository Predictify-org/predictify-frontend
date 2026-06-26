/** @jest-environment node */
import { GET } from "./route";
import { db, resetDb } from "@/app/lib/db";

describe("GET /api/v2/streams/:id - weak ETag and If-None-Match cache revalidation", () => {
  const streamId = "stream-ada";

  beforeEach(() => {
    resetDb();
  });

  it("returns 200 OK with stream data and ETag header on first request", async () => {
    const req = new Request(`http://localhost/api/v2/streams/${streamId}`, {
      method: "GET",
    });

    const res = await GET(req, { params: Promise.resolve({ id: streamId }) });
    expect(res.status).toBe(200);

    const etag = res.headers.get("etag");
    expect(etag).toBeDefined();
    expect(etag).toBe(`W/"2026-04-28T10:30:00Z"`); // Matches updatedAt of stream-ada in db.ts
    expect(res.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");

    const body = await res.json();
    expect(body.data.id).toBe(streamId);
  });

  it("returns 304 Not Modified when request has matching If-None-Match weak ETag", async () => {
    const req = new Request(`http://localhost/api/v2/streams/${streamId}`, {
      method: "GET",
      headers: {
        "If-None-Match": `W/"2026-04-28T10:30:00Z"`,
      },
    });

    const res = await GET(req, { params: Promise.resolve({ id: streamId }) });
    expect(res.status).toBe(304);
    expect(res.headers.get("etag")).toBe(`W/"2026-04-28T10:30:00Z"`);
    expect(res.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");

    // A 304 response must not contain a body
    const text = await res.text();
    expect(text).toBe("");
  });

  it("returns 304 Not Modified when If-None-Match is '*' or contains matching ETag in list", async () => {
    const reqStar = new Request(`http://localhost/api/v2/streams/${streamId}`, {
      method: "GET",
      headers: {
        "If-None-Match": "*",
      },
    });
    const resStar = await GET(reqStar, { params: Promise.resolve({ id: streamId }) });
    expect(resStar.status).toBe(304);

    const reqList = new Request(`http://localhost/api/v2/streams/${streamId}`, {
      method: "GET",
      headers: {
        "If-None-Match": `W/"other-etag", W/"2026-04-28T10:30:00Z"`,
      },
    });
    const resList = await GET(reqList, { params: Promise.resolve({ id: streamId }) });
    expect(resList.status).toBe(304);
  });

  it("returns 200 OK and updates ETag when the stream's updatedAt timestamp changes", async () => {
    // 1. Get initial stream
    const stream = db.streams.get(streamId);
    expect(stream).toBeDefined();

    // 2. Perform request with the initial ETag -> 304 Not Modified
    const req1 = new Request(`http://localhost/api/v2/streams/${streamId}`, {
      method: "GET",
      headers: {
        "If-None-Match": `W/"${stream.updatedAt}"`,
      },
    });
    const res1 = await GET(req1, { params: Promise.resolve({ id: streamId }) });
    expect(res1.status).toBe(304);

    // 3. Update the stream's updatedAt timestamp in the database
    const updatedTime = "2026-05-01T12:00:00Z";
    db.streams.set(streamId, {
      ...stream,
      updatedAt: updatedTime,
    });

    // 4. Perform the same request with the old ETag -> 200 OK with the new ETag
    const req2 = new Request(`http://localhost/api/v2/streams/${streamId}`, {
      method: "GET",
      headers: {
        "If-None-Match": `W/"${stream.updatedAt}"`, // Old ETag
      },
    });
    const res2 = await GET(req2, { params: Promise.resolve({ id: streamId }) });
    expect(res2.status).toBe(200);
    expect(res2.headers.get("etag")).toBe(`W/"${updatedTime}"`);

    const body = await res2.json();
    expect(body.data.id).toBe(streamId);
  });

  it("returns 404 Not Found if the stream does not exist", async () => {
    const req = new Request(`http://localhost/api/v2/streams/non-existent`, {
      method: "GET",
    });

    const res = await GET(req, { params: Promise.resolve({ id: "non-existent" }) });
    expect(res.status).toBe(404);
  });
});
