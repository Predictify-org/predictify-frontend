import { Indexer, IndexedEvent, EventFetcher } from "./indexer";

describe("Indexer", () => {
  let indexer: Indexer;
  let mockFetcher: EventFetcher;
  let mockStorage: any;

  beforeEach(() => {
    mockFetcher = {
      fetchEvents: jest.fn().mockResolvedValue([]),
    };
    mockStorage = {
      saveEvent: jest.fn().mockResolvedValue(undefined),
      deleteEventsFromLedger: jest.fn().mockResolvedValue(undefined),
    };
    indexer = new Indexer({ overlapWindow: 2, hashWindowSize: 5 }, mockFetcher, mockStorage);
  });

  test("should process events and track cursor", async () => {
    const event: IndexedEvent = { id: "1", type: "test", ledger: 1, hash: "h1", prevHash: "h0", data: {} };
    await indexer.processEvent(event);
    expect(mockStorage.saveEvent).toHaveBeenCalledWith(event);
    expect(indexer.metrics.eventsProcessed).toBe(1);
  });

  test("should detect gaps and backfill", async () => {
    const event1: IndexedEvent = { id: "1", type: "test", ledger: 1, hash: "h1", prevHash: "h0", data: {} };
    const event2: IndexedEvent = { id: "5", type: "test", ledger: 5, hash: "h5", prevHash: "h4", data: {} };
    
    await indexer.processEvent(event1);
    await indexer.processEvent(event2);

    expect(mockFetcher.fetchEvents).toHaveBeenCalledWith(2, 4);
    expect(indexer.metrics.gapsDetected).toBe(1);
  });

  test("should detect reorgs and rollback", async () => {
    const event1: IndexedEvent = { id: "1", type: "test", ledger: 1, hash: "h1", prevHash: "h0", data: {} };
    const event2: IndexedEvent = { id: "2", type: "test", ledger: 2, hash: "h2", prevHash: "h1", data: {} };
    const reorgEvent2: IndexedEvent = { id: "2b", type: "test", ledger: 2, hash: "h2b", prevHash: "h1b", data: {} };
    
    await indexer.processEvent(event1);
    await indexer.processEvent(event2);
    
    // Process reorg event
    await indexer.processEvent(reorgEvent2);

    expect(mockStorage.deleteEventsFromLedger).toHaveBeenCalledWith(1);
    expect(indexer.metrics.reorgsDetected).toBe(1);
  });
});
