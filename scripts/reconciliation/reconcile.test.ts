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
});
