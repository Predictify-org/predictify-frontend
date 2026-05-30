import { ReconciliationService } from './reconcile';
import { dbClient } from '../../lib/dbClient';
import { onChainClient } from '../../lib/onChainClient';
import { ContractStreamStatus } from '../../types';

jest.mock('../../lib/dbClient');
jest.mock('../../lib/onChainClient');

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReconciliationService();
  });

  it('should return SUCCESS when DB and on-chain balances match', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockResolvedValue({
      id: 's1', total_amount: 100n, released_amount: 50n, status: ContractStreamStatus.ACTIVE
    });

    const report = await service.runReconciliation();
    
    expect(report.status).toBe('SUCCESS');
    expect(report.totalStreamsChecked).toBe(1);
    expect(report.mismatches).toHaveLength(0);
  });

  it('should detect mismatches in released_amount', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockResolvedValue({
      id: 's1', total_amount: 100n, released_amount: 60n, status: ContractStreamStatus.ACTIVE
    });

    const report = await service.runReconciliation();
    
    expect(report.status).toBe('MISMATCH_FOUND');
    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0]).toMatchObject({
      streamId: 's1',
      field: 'released_amount',
      dbValue: 50n,
      onChainValue: 60n
    });
  });

  it('should respect tolerance levels', async () => {
    service = new ReconciliationService({ tolerance: 5n });
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockResolvedValue({
      id: 's1', total_amount: 100n, released_amount: 53n, status: ContractStreamStatus.ACTIVE
    });

    const report = await service.runReconciliation();
    
    expect(report.status).toBe('SUCCESS');
    expect(report.mismatches).toHaveLength(0);
  });

  it('should fail if on-chain fetch fails', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockRejectedValue(new Error('Network Error'));

    const report = await service.runReconciliation();
    
    expect(report.status).toBe('FAILED');
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].error).toBe('Network Error');
  });

  it('should detect missing on-chain records', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's_missing', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockResolvedValue(null);

    const report = await service.runReconciliation();

    expect(report.status).toBe('MISMATCH_FOUND');
    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0]).toMatchObject({
      streamId: 's_missing',
      field: 'presence',
      dbValue: 'exists',
      onChainValue: 'missing'
    });
  });

  it('should detect escrow invariant violations (negative balances)', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockResolvedValue({
      id: 's1', total_amount: -100n, released_amount: 50n, status: ContractStreamStatus.ACTIVE
    });

    const report = await service.runReconciliation();

    expect(report.status).toBe('MISMATCH_FOUND');
    expect(report.mismatches).toHaveLength(2); // total_amount mismatch AND escrow-invariant violation
    expect(report.mismatches).toContainEqual(expect.objectContaining({
      field: 'escrow-invariant',
      onChainValue: expect.stringContaining('Total amount cannot be negative')
    }));
  });

  it('should detect escrow invariant violations (over-release)', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockResolvedValue({
      id: 's1', total_amount: 100n, released_amount: 150n, status: ContractStreamStatus.ACTIVE
    });

    const report = await service.runReconciliation();

    expect(report.status).toBe('MISMATCH_FOUND');
    expect(report.mismatches.some(m => m.field === 'escrow-invariant')).toBe(true);
  });

  it('should run reconciliation for a single stream by id', async () => {
    (dbClient.getStreamById as jest.Mock).mockResolvedValue(
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    );
    (onChainClient.fetchStream as jest.Mock).mockResolvedValue({
      id: 's1', total_amount: 100n, released_amount: 50n, status: ContractStreamStatus.ACTIVE
    });

    const report = await service.runReconciliation({ streamId: 's1' });

    expect(report.status).toBe('SUCCESS');
    expect(report.totalStreamsChecked).toBe(1);
    expect(dbClient.getStreamById).toHaveBeenCalledWith('s1');
  });

  it('should not persist status if dryRun is true', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockResolvedValue({
      id: 's1', total_amount: 100n, released_amount: 50n, status: ContractStreamStatus.ACTIVE
    });

    const report = await service.runReconciliation({ dryRun: true });

    expect(report.status).toBe('SUCCESS');
    expect(dbClient.updateLastRunStatus).not.toHaveBeenCalled();
  });

  it('should persist status if dryRun is false', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockResolvedValue({
      id: 's1', total_amount: 100n, released_amount: 50n, status: ContractStreamStatus.ACTIVE
    });

    const report = await service.runReconciliation({ dryRun: false });

    expect(report.status).toBe('SUCCESS');
    expect(dbClient.updateLastRunStatus).toHaveBeenCalledWith('SUCCESS', expect.any(Number));
  });

  it('should fail single-stream reconciliation if not found in DB', async () => {
    (dbClient.getStreamById as jest.Mock).mockResolvedValue(null);
    const report = await service.runReconciliation({ streamId: 'non-existent' });
    expect(report.status).toBe('FAILED');
    expect(report.errors[0].error).toContain('Stream not found in DB');
  });

  it('should handle single-stream DB fetch error', async () => {
    (dbClient.getStreamById as jest.Mock).mockRejectedValue(new Error('DB Error'));
    const report = await service.runReconciliation({ streamId: 's1' });
    expect(report.status).toBe('FAILED');
    expect(report.errors[0].error).toBe('DB Error');
  });

  it('should handle all-streams DB fetch error', async () => {
    (dbClient.getStreams as jest.Mock).mockRejectedValue(new Error('Fetch Error'));
    const report = await service.runReconciliation();
    expect(report.status).toBe('FAILED');
    expect(report.errors[0].error).toBe('Fetch Error');
  });

  it('should handle single stream fetch on-chain error in page loop', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockRejectedValue(new Error('RPC Error'));
    const report = await service.runReconciliation();
    expect(report.status).toBe('FAILED');
    expect(report.errors[0].error).toBe('RPC Error');
  });

  it('should log warning if updateLastRunStatus throws', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([]);
    (dbClient.updateLastRunStatus as jest.Mock).mockRejectedValue(new Error('Update Failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await service.runReconciliation({ dryRun: false });
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to update last run status in DB:'), expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should detect recipient address mismatch', async () => {
    (dbClient.getStreams as jest.Mock).mockResolvedValue([
      { id: 's1', total_amount: '100', released_amount: '50', status: 'ACTIVE', recipient_address: 'addr1' }
    ]);
    (onChainClient.fetchStream as jest.Mock).mockResolvedValue({
      id: 's1', total_amount: 100n, released_amount: 50n, status: ContractStreamStatus.ACTIVE, recipient_address: 'addr2'
    });
    
    const report = await service.runReconciliation();
    
    expect(report.status).toBe('MISMATCH_FOUND');
    expect(report.mismatches).toHaveLength(1);
    expect(report.mismatches[0]).toMatchObject({
      streamId: 's1',
      field: 'recipient_address',
      dbValue: 'addr1',
      onChainValue: 'addr2'
    });
  });
});
