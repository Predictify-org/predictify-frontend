import { EventEmitter } from "events";
import { getStore } from "@/app/lib/db";
import { activityEventToTimelineEntry } from "@/app/lib/repositories/activity-timeline";
import type { ActivityEvent } from "@/app/types/openapi";

/**
 * Server-side event bus for StreamPay events.
 * This acts as the central hub for emitting and subscribing to live updates.
 * 
 * In a distributed production environment, this would be replaced by 
 * Redis Pub/Sub or a similar message broker.
 */
class StreamEventBus extends EventEmitter {
  private static instance: StreamEventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
    this.setupProjectionHandler();
  }

  public static getInstance(): StreamEventBus {
    if (!StreamEventBus.instance) {
      StreamEventBus.instance = new StreamEventBus();
    }
    return StreamEventBus.instance;
  }

  /**
   * Emit a stream update event
   */
  emitStreamUpdated(streamId: string, data: any) {
    this.emit(`stream:updated:${streamId}`, data);
  }

  /**
   * Emit a settlement finished event
   */
  emitSettleFinished(streamId: string, data: any) {
    this.emit(`settle:finished:${streamId}`, data);
  }

  /**
   * Emit a raw activity event to be projected onto the timeline.
   */
  emitActivityEvent(event: ActivityEvent) {
    this.emit("activity:new", event);
  }

  /**
   * Subscribe to raw activity events.
   */
  onActivityEvent(handler: (event: ActivityEvent) => void) {
    this.on("activity:new", handler);
  }

  /**
   * Set up the internal projection handler that writes to the
   * denormalized activity_timeline store whenever a new event
   * is emitted.
   */
  private setupProjectionHandler() {
    this.onActivityEvent((event) => {
      try {
        const store = getStore();
        const entry = activityEventToTimelineEntry(event);
        store.activityTimeline.append(entry);
      } catch (err) {
        // If the store is not available (e.g. postgres adapter not wired),
        // silently skip. The projection is best-effort for the in-memory store.
      }
    });
  }
}

export const eventBus = StreamEventBus.getInstance();
