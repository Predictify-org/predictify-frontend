import { db } from "./db";
import { transition } from "./state-machine";
import { StreamAction, ApiError } from "@/app/types/openapi";

export type ServiceResult<T> = 
  | { ok: true; data: T }
  | { ok: false; error: ApiError; status: number };

export class StreamService {
  static async applyAction(streamId: string, action: StreamAction, idempotencyKey?: string): Promise<ServiceResult<any>> {
    const stream = db.streams.get(streamId);
    if (!stream) {
      return { 
        ok: false, 
        error: { code: "STREAM_NOT_FOUND", message: `Stream '${streamId}' not found`, request_id: "mock-id" },
        status: 404 
      };
    }

    // Idempotency check (simplified for mock)
    if (idempotencyKey && db.idempotency.has(idempotencyKey)) {
      return { ok: true, data: db.idempotency.get(idempotencyKey) };
    }

    const result = transition(stream.status, action);
    if (!result.ok) {
      return { 
        ok: false, 
        error: { code: result.code, message: result.error, request_id: "mock-id" },
        status: 409 
      };
    }

    // Update stream state
    stream.status = result.nextStatus;
    stream.updatedAt = new Date().toISOString();
    
    // Update nextAction hint for UI
    if (stream.status === "active") stream.nextAction = "pause";
    if (stream.status === "paused") stream.nextAction = "start";
    if (stream.status === "ended") stream.nextAction = "withdraw";
    if (stream.status === "withdrawn") stream.nextAction = undefined;

    db.streams.set(streamId, stream);

    if (idempotencyKey) {
      db.idempotency.set(idempotencyKey, stream);
    }

    return { ok: true, data: stream };
  }
}
