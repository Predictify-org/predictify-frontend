/** @jest-environment node */

import { POST as settleStream } from "./[id]/settle/route";
import { POST as stopStream } from "./[id]/stop/route";
import { POST as withdrawFromStream } from "./[id]/withdraw/route";
import { auditLogStore, resetAuditLogStore } from "@/app/lib/audit-log";
import { resetDb } from "@/app/lib/db";

function buildRequest(requestId: string, actorId: string, role: string) {
  return new Request(`http://localhost/${requestId}`, {
    headers: {
      "x-request-id": requestId,
      "x-streampay-actor-id": actorId,
      "x-streampay-actor-role": role,
    },
    method: "POST",
  });
}

describe("privileged stream audit hooks", () => {
  beforeEach(() => {
    resetDb();
    resetAuditLogStore();
  });

  it("records stop, settle, and withdraw actions in the append-only audit log", async () => {
    const stopResponse = await stopStream(buildRequest("req-stop-1", "support-supervisor-4", "support"), {
      params: Promise.resolve({ id: "stream-kemi" }),
    });
    expect(stopResponse.status).toBe(200);

    const settleResponse = await settleStream(buildRequest("req-settle-1", "ops-admin-17", "admin"), {
      params: Promise.resolve({ id: "stream-ada" }),
    });
    expect(settleResponse.status).toBe(200);

    const withdrawResponse = await withdrawFromStream(buildRequest("req-withdraw-1", "finance-operator-8", "finance"), {
      params: Promise.resolve({ id: "stream-yusuf" }),
    });
    expect(withdrawResponse.status).toBe(200);

    const stopEntry = auditLogStore.list({ requestId: "req-stop-1" })[0];
    const settleEntry = auditLogStore.list({ requestId: "req-settle-1" })[0];
    const withdrawEntry = auditLogStore.list({ requestId: "req-withdraw-1" })[0];

    expect(stopEntry.action).toBe("stream.stop.override");
    expect(stopEntry.actor.role).toBe("support");
    expect(stopEntry.target.id).toBe("stream-kemi");

    expect(settleEntry.action).toBe("stream.settle");
    expect(settleEntry.actor.id).toBe("ops-admin-17");
    expect(settleEntry.metadata?.settlementTxHash).toMatch(/^fake-tx-/);

    expect(withdrawEntry.action).toBe("stream.withdraw");
    expect(withdrawEntry.actor.role).toBe("finance");
    expect(auditLogStore.assertIntegrity()).toBe(true);
  });
});
