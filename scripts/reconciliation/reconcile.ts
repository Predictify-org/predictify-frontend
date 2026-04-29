import { dbClient } from '../../lib/dbClient';
import { onChainClient } from '../../lib/onChainClient';
import { DbStream, ReconciliationDiff, ReconciliationReport } from './types';
import { OnChainStream } from '../../types';

export class ReconciliationService {
  private tolerance: bigint = 0n; // Set tolerance for rounding if necessary

  constructor(options: { tolerance?: bigint } = {}) {
    this.tolerance = options.tolerance ?? 0n;
  }

  public async runReconciliation(): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      totalStreamsChecked: 0,
      mismatches: [],
      errors: [],
      status: 'SUCCESS',
    };

    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const dbStreams = await dbClient.getStreams(limit, offset);
      if (dbStreams.length === 0) {
        hasMore = false;
        break;
      }

      for (const dbStream of dbStreams) {
        report.totalStreamsChecked++;
        try {
          const onChainStream = await onChainClient.fetchStream(dbStream.id);
          if (!onChainStream) {
            report.errors.push({ streamId: dbStream.id, error: "Stream not found on-chain" });
            continue;
          }

          const diffs = this.compareStreams(dbStream, onChainStream);
          if (diffs.length > 0) {
            report.mismatches.push(...diffs);
          }
        } catch (err) {
          report.errors.push({ 
            streamId: dbStream.id, 
            error: err instanceof Error ? err.message : String(err) 
          });
        }
      }

      offset += limit;
      // In a real scenario, we might have a more robust pagination check
      if (dbStreams.length < limit) hasMore = false;
    }

    if (report.mismatches.length > 0 || report.errors.length > 0) {
      report.status = report.errors.length > 0 ? 'FAILED' : 'MISMATCH_FOUND';
    }

    await dbClient.updateLastRunStatus(report.status, Date.now());
    return report;
  }

  private compareStreams(db: DbStream, chain: OnChainStream): ReconciliationDiff[] {
    const diffs: ReconciliationDiff[] = [];

    // Compare total_amount
    const dbTotal = BigInt(db.total_amount);
    if (this.isMismatch(dbTotal, chain.total_amount)) {
      diffs.push({
        streamId: db.id,
        field: 'total_amount',
        dbValue: dbTotal,
        onChainValue: chain.total_amount,
        toleranceApplied: this.tolerance > 0n
      });
    }

    // Compare released_amount
    const dbReleased = BigInt(db.released_amount);
    if (this.isMismatch(dbReleased, chain.released_amount)) {
      diffs.push({
        streamId: db.id,
        field: 'released_amount',
        dbValue: dbReleased,
        onChainValue: chain.released_amount,
        toleranceApplied: this.tolerance > 0n
      });
    }

    // Compare status
    if (db.status !== chain.status) {
      diffs.push({
        streamId: db.id,
        field: 'status',
        dbValue: db.status,
        onChainValue: chain.status,
        toleranceApplied: false
      });
    }

    return diffs;
  }

  private isMismatch(dbValue: bigint, chainValue: bigint): boolean {
    const diff = dbValue > chainValue ? dbValue - chainValue : chainValue - dbValue;
    return diff > this.tolerance;
  }
}
