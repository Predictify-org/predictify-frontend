/** @jest-environment node */

import {
  _resetQuotasForTesting,
  listQuotas,
  getQuota,
  upsertQuota,
  replaceQuota,
  deleteQuota,
} from "@/app/lib/quotas";

beforeEach(() => {
  _resetQuotasForTesting();
});

// ── listQuotas ────────────────────────────────────────────────────────────────

describe("listQuotas", () => {
  it("returns empty array when no quotas exist", () => {
    expect(listQuotas()).toEqual([]);
  });

  it("returns all created quotas", () => {
    upsertQuota({ scope: "org", subject: "GORG1" });
    upsertQuota({ scope: "user", subject: "GUSER1" });
    expect(listQuotas()).toHaveLength(2);
  });
});

// ── upsertQuota ───────────────────────────────────────────────────────────────

describe("upsertQuota", () => {
  it("creates a quota with defaults for omitted limits", () => {
    const quota = upsertQuota({ scope: "org", subject: "GORG1" });
    expect(quota.id).toMatch(/^quota-/);
    expect(quota.scope).toBe("org");
    expect(quota.subject).toBe("GORG1");
    expect(quota.maxActiveStreams).toBe(0);
    expect(quota.maxMonthlyVolumeStroops).toBe(0);
    expect(quota.createdAt).toBeTruthy();
    expect(quota.updatedAt).toBeTruthy();
  });

  it("stores explicit limits", () => {
    const quota = upsertQuota({
      scope: "user",
      subject: "GUSER1",
      maxActiveStreams: 10,
      maxMonthlyVolumeStroops: 5_000_000,
    });
    expect(quota.maxActiveStreams).toBe(10);
    expect(quota.maxMonthlyVolumeStroops).toBe(5_000_000);
  });

  it("updates an existing (scope, subject) quota in-place, preserving id and createdAt", () => {
    const first = upsertQuota({ scope: "org", subject: "GORG1", maxActiveStreams: 5 });
    const second = upsertQuota({ scope: "org", subject: "GORG1", maxActiveStreams: 20 });

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.maxActiveStreams).toBe(20);
    expect(listQuotas()).toHaveLength(1);
  });
});

// ── getQuota ──────────────────────────────────────────────────────────────────

describe("getQuota", () => {
  it("returns undefined for unknown id", () => {
    expect(getQuota("nonexistent")).toBeUndefined();
  });

  it("returns the quota for a known id", () => {
    const q = upsertQuota({ scope: "org", subject: "GORG1" });
    expect(getQuota(q.id)).toEqual(q);
  });
});

// ── replaceQuota ──────────────────────────────────────────────────────────────

describe("replaceQuota", () => {
  it("returns undefined for unknown id", () => {
    expect(replaceQuota("bad-id", { scope: "org", subject: "G" })).toBeUndefined();
  });

  it("replaces the quota fields and updates updatedAt", () => {
    const original = upsertQuota({ scope: "org", subject: "GORG1", maxActiveStreams: 5 });
    const updated = replaceQuota(original.id, {
      scope: "user",
      subject: "GNEW",
      maxActiveStreams: 99,
    });

    expect(updated).toBeDefined();
    expect(updated!.id).toBe(original.id);
    expect(updated!.scope).toBe("user");
    expect(updated!.subject).toBe("GNEW");
    expect(updated!.maxActiveStreams).toBe(99);
    expect(typeof updated!.updatedAt).toBe("string");
  });
});

// ── deleteQuota ───────────────────────────────────────────────────────────────

describe("deleteQuota", () => {
  it("returns false for a nonexistent id", () => {
    expect(deleteQuota("nope")).toBe(false);
  });

  it("removes the quota and returns true", () => {
    const q = upsertQuota({ scope: "org", subject: "GORG1" });
    expect(deleteQuota(q.id)).toBe(true);
    expect(getQuota(q.id)).toBeUndefined();
    expect(listQuotas()).toHaveLength(0);
  });
});
