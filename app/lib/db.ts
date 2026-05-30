import { Stream, ActivityEvent } from "@/app/types/openapi";
import { Org, Member } from "@/app/types/org";

export const db = {
  streams: new Map<string, Stream>([
    [
      "stream-ada",
      {
        id: "stream-ada",
        recipient: "Ada Creative Studio",
        rate: "120 XLM / month",
        schedule: "Pays every 30 days",
        status: "active",
        nextAction: "pause",
        createdAt: "2026-04-01T09:00:00Z",
        updatedAt: "2026-04-28T10:30:00Z",
      },
    ],
    [
      "stream-kemi",
      {
        id: "stream-kemi",
        recipient: "Kemi Onboarding Support",
        rate: "32 XLM / week",
        schedule: "Draft stream ready to launch",
        status: "draft",
        nextAction: "start",
        createdAt: "2026-04-10T14:00:00Z",
        updatedAt: "2026-04-28T11:00:00Z",
      },
    ],
    [
      "stream-yusuf",
      {
        id: "stream-yusuf",
        recipient: "Yusuf QA Partnership",
        rate: "18 XLM / day",
        schedule: "Ended yesterday with funds available",
        status: "ended",
        nextAction: "withdraw",
        createdAt: "2026-04-15T08:00:00Z",
        updatedAt: "2026-04-27T20:00:00Z",
      },
    ],
  ]),

  orgs: new Map<string, Org>([
    ["org-1", { id: "org-1", name: "StreamPay Org", ownerWallet: "GATODH2T75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW" }]
  ]),

  members: new Map<string, Member>([
    ["org-1:GATODH2T75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW", { orgId: "org-1", walletAddress: "GATODH2T75IVFB7MG6ZKKIFPWFNVJBXVPUMTYV5ANT2O2ZWL7GSDZWNRW", role: "owner" }]
  ]),

  activity: new Map<string, ActivityEvent>([
    ["a7383234-4224-49dc-b868-0cdf37649fda", { id: "a7383234-4224-49dc-b868-0cdf37649fda", type: "wallet.connected", timestamp: "2026-04-28T09:00:00Z", description: "Wallet connected and authenticated." }],
    ["2b9d1d0c-bef4-46bc-a783-3073b28353fc", { id: "2b9d1d0c-bef4-46bc-a783-3073b28353fc", type: "stream.created", streamId: "stream-ada", timestamp: "2026-04-01T09:00:00Z", description: "Stream 'Design Retainer' created and set to draft." }],
    ["d1578871-4be9-4c6a-bef5-12b2b5836478", { id: "d1578871-4be9-4c6a-bef5-12b2b5836478", type: "stream.started", streamId: "stream-ada", timestamp: "2026-04-01T09:05:00Z", description: "Stream 'Design Retainer' activated." }],
    ["288f315d-5520-46e9-8acf-96994c87b786", { id: "288f315d-5520-46e9-8acf-96994c87b786", type: "stream.created", streamId: "stream-kemi", timestamp: "2026-04-10T14:00:00Z", description: "Stream 'Kemi Onboarding Support' created as draft." }],
    ["3bea183d-c3b5-4e96-9fbe-804f3aee49e9", { id: "3bea183d-c3b5-4e96-9fbe-804f3aee49e9", type: "stream.created", streamId: "stream-yusuf", timestamp: "2026-04-15T08:00:00Z", description: "Stream 'Yusuf QA Partnership' created." }],
    ["5ffa85da-27a4-4f7c-bde0-e5c067a28015", { id: "5ffa85da-27a4-4f7c-bde0-e5c067a28015", type: "stream.stopped", streamId: "stream-yusuf", timestamp: "2026-04-27T20:00:00Z", description: "Stream 'Yusuf QA Partnership' stopped and settled automatically." }],
  ]),

  idempotency: new Map<string, unknown>(),
};

export function encodeCursor(id: string): string {
  return Buffer.from(id).toString("base64");
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf8");
}
