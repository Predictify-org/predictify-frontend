import { HorizonIndexer, HorizonEvent, cursorsDb, processedEventsDb } from './indexer';

describe('HorizonIndexer', () => {
  let indexer: HorizonIndexer;

  beforeEach(() => {
    cursorsDb.clear();
    processedEventsDb.clear();
    
    indexer = new HorizonIndexer({
      network: 'testnet',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      overlapWindow: 5,
      stallThresholdMs: 1000,
    });
  });

  afterEach(() => {
    indexer.stop();
  });

  it('should persist last_ledger cursor', async () => {
    await indexer.saveCursor(100);
    const cursor = await indexer.getCursor();
    expect(cursor).toBe(100);
  });

  it('should deduplicate events idempotently', async () => {
    const event: HorizonEvent = {
      id: 'evt_1',
      type: 'payment',
      ledger: 101,
      data: { amount: '10' }
    };

    await indexer.processEvent(event, 'corr-1');
    expect(processedEventsDb.size).toBe(1);
    
    // Process same event again
    await indexer.processEvent(event, 'corr-2');
    // Size should still be 1
    expect(processedEventsDb.size).toBe(1);
    
    const cursor = await indexer.getCursor();
    expect(cursor).toBe(101);
  });

  it('should support backfill with a safe overlap window', async () => {
    await indexer.saveCursor(100);
    
    const mockEvents: HorizonEvent[] = [
      { id: 'evt_94', type: 'payment', ledger: 94, data: {} }, // Before overlap (should be skipped)
      { id: 'evt_95', type: 'payment', ledger: 95, data: {} }, // Start of overlap
      { id: 'evt_100', type: 'payment', ledger: 100, data: {} }, // Overlap event
      { id: 'evt_102', type: 'payment', ledger: 102, data: {} }, // New event
    ];

    await indexer.backfill(105, mockEvents);

    // Should only process events from ledger 95 to 105
    expect(processedEventsDb.has('testnet:evt_94:payment')).toBe(false);
    expect(processedEventsDb.has('testnet:evt_95:payment')).toBe(true);
    expect(processedEventsDb.has('testnet:evt_100:payment')).toBe(true);
    expect(processedEventsDb.has('testnet:evt_102:payment')).toBe(true);
    
    const cursor = await indexer.getCursor();
    expect(cursor).toBe(102); // The last processed event ledger
  });

  it('should handle drop/restart mid-stream via backfill', async () => {
    const mockEvents: HorizonEvent[] = [
      { id: 'evt_1', type: 'payment', ledger: 1, data: {} },
      { id: 'evt_2', type: 'payment', ledger: 2, data: {} },
      { id: 'evt_3', type: 'payment', ledger: 3, data: {} },
      { id: 'evt_4', type: 'payment', ledger: 4, data: {} },
    ];

    // Simulating dropping mid-stream at ledger 2
    await indexer.saveCursor(2);
    // Processed 1 and 2
    await indexer.processEvent(mockEvents[0], 'corr-drop');
    await indexer.processEvent(mockEvents[1], 'corr-drop');

    // Restart and backfill up to ledger 4
    await indexer.backfill(4, mockEvents);

    // Overlap window is 5, so it should re-process from max(0, 2 - 5) = 0
    // Because of deduplication, events 1 and 2 shouldn't be re-added or fail
    expect(processedEventsDb.size).toBe(4);
    expect(await indexer.getCursor()).toBe(4);
  });

  it('should alert if cursor stalls', () => {
    jest.useFakeTimers();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    indexer.saveCursor(100);
    
    // Advance time past stallThresholdMs (1000ms)
    jest.advanceTimersByTime(1500);
    
    indexer.checkStall();
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ALERT] Cursor stalled for network testnet'));
    
    consoleSpy.mockRestore();
    jest.useRealTimers();
  });
  
  it('should log structured errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const event: HorizonEvent = {
      id: 'bad_evt',
      type: 'payment',
      ledger: 105,
      data: {},
      streamId: 'stream_1'
    };
    
    // Inject a bug/failure intentionally
    const errorIndexer = new HorizonIndexer({
      network: 'testnet',
      horizonUrl: 'test',
      overlapWindow: 5,
      stallThresholdMs: 1000,
    });
    
    // Override saveCursor to throw
    errorIndexer.saveCursor = jest.fn().mockRejectedValue(new Error('DB connection failed'));
    
    await expect(errorIndexer.processEvent(event, 'corr-123')).rejects.toThrow('DB connection failed');
    
    expect(consoleSpy).toHaveBeenCalled();
    const logCall = consoleSpy.mock.calls[0][0];
    const parsedLog = JSON.parse(logCall);
    
    expect(parsedLog.level).toBe('error');
    expect(parsedLog.correlation_id).toBe('corr-123');
    expect(parsedLog.stream_id).toBe('stream_1');
    expect(parsedLog.error).toBe('DB connection failed');
    
    consoleSpy.mockRestore();
  });
});
