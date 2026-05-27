import { EventEmitter } from "events";

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
    // Increase max listeners to avoid warnings during development
    this.setMaxListeners(100);
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
}

export const eventBus = StreamEventBus.getInstance();
