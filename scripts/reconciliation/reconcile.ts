import { dbClient } from '../../lib/dbClient';
import { onChainClient } from '../../lib/onChainClient';
import { DbStream, ReconciliationDiff, ReconciliationReport } from './types';
import { OnChainStream } from '../../types';
import { mapDbStream, mapOnChainStream } from '../../mapping';
import { EscrowInvariants } from '../../escrow-invariants';

export class ReconciliationService {
  private tolerance: bigint = 0n; // Set tolerance for rounding if necessary

  constructor(options: { tolerance?: bigint } = {}) {
    this.tolerance = options.tolerance ?? 0n;
  }

  public async runReconciliation(options?: { streamId?: string; dryRun?: boolean; dbStreams?: DbStream[] }): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      totalStreamsChecked: 0,
      mismatches: [],
      errors: [],
      status: 'SUCCESS',
    };

    const streamId = options?.streamId;
    const dryRun = options?.dryRun ?? false;
    const inputDbStreams = options?.dbStreams;

    if (inputDbStreams) {
      // Reconcile over the provided streams
      const targetStreams = streamId 
        ? inputDbStreams.filter(s => s.id === streamId)
        : inputDbStreams;

      if (streamId && targetStreams.length === 0) {
        report.errors.push({ streamId, error: "Stream not found in DB" });
      } else {
        for (const dbStream of targetStreams) {
          report.totalStreamsChecked++;
          try {
            await this.reconcileSingleStream(dbStream, report);
          } catch (err) {
            report.errors.push({
              streamId: dbStream.id,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }
    } else {
      // Reconcile over dbClient streams
      if (streamId) {
        // Process a single stream
        try {
          const dbStream = await dbClient.getStreamById(streamId);
          if (!dbStream) {
            report.errors.push({ streamId, error: "Stream not found in DB" });
          } else {
            report.totalStreamsChecked++;
            await this.reconcileSingleStream(dbStream, report);
          }
        } catch (err) {
          report.errors.push({
            streamId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        // Process all streams using pagination
        let offset = 0;
        const limit = 50;
        let hasMore = true;

        while (hasMore) {
          let dbStreams: DbStream[] = [];
          try {
            dbStreams = await dbClient.getStreams(limit, offset);
          } catch (err) {
            report.status = 'FAILED';
            report.errors.push({
              streamId: 'all-streams-fetch',
              error: err instanceof Error ? err.message : String(err),
            });
            break;
          }

          if (dbStreams.length === 0) {
            hasMore = false;
            break;
          }

          for (const dbStream of dbStreams) {
            report.totalStreamsChecked++;
            try {
              await this.reconcileSingleStream(dbStream, report);
            } catch (err) {
              report.errors.push({
                streamId: dbStream.id,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }

          offset += limit;
          if (dbStreams.length < limit) hasMore = false;
        }
      }
    }

    if (report.mismatches.length > 0 || report.errors.length > 0) {
      report.status = report.errors.length > 0 ? 'FAILED' : 'MISMATCH_FOUND';
    }

    if (!dryRun) {
      try {
        await dbClient.updateLastRunStatus(report.status, Date.now());
      } catch (err) {
        console.error("Failed to update last run status in DB:", err);
      }
    }

    return report;
  }

  private async reconcileSingleStream(dbStream: DbStream, report: ReconciliationReport): Promise<void> {
    const onChainStream = await onChainClient.fetchStream(dbStream.id);
    if (!onChainStream) {
      report.mismatches.push({
        streamId: dbStream.id,
        field: 'presence',
        dbValue: 'exists',
        onChainValue: 'missing',
        toleranceApplied: false,
      });
      return;
    }

    // Assert Escrow Invariants
    const invariantCheck = EscrowInvariants.validateBalances(onChainStream);
    if (!invariantCheck.isValid) {
      report.mismatches.push({
        streamId: dbStream.id,
        field: 'escrow-invariant',
        dbValue: 'valid',
        onChainValue: `violated: ${invariantCheck.error}`,
        toleranceApplied: false,
      });
    }

    // Compare fields mapped via mapping.ts
    const dbMapped = mapDbStream(dbStream);
    const chainMapped = mapOnChainStream(onChainStream);

    // Compare total_amount
    if (this.isMismatch(dbMapped.totalAmount, chainMapped.totalAmount)) {
      report.mismatches.push({
        streamId: dbStream.id,
        field: 'total_amount',
        dbValue: dbMapped.totalAmount,
        onChainValue: chainMapped.totalAmount,
        toleranceApplied: this.tolerance > 0n,
      });
    }

    // Compare released_amount
    if (this.isMismatch(dbMapped.releasedAmount, chainMapped.releasedAmount)) {
      report.mismatches.push({
        streamId: dbStream.id,
        field: 'released_amount',
        dbValue: dbMapped.releasedAmount,
        onChainValue: chainMapped.releasedAmount,
        toleranceApplied: this.tolerance > 0n,
      });
    }

    // Compare status (case-insensitive for safety, though they should match)
    if (dbMapped.status.toUpperCase() !== chainMapped.status.toUpperCase()) {
      report.mismatches.push({
        streamId: dbStream.id,
        field: 'status',
        dbValue: dbMapped.status,
        onChainValue: chainMapped.status,
        toleranceApplied: false,
      });
    }

    // Compare recipient address
    if (dbMapped.recipientAddress !== chainMapped.recipientAddress) {
      report.mismatches.push({
        streamId: dbStream.id,
        field: 'recipient_address',
        dbValue: dbMapped.recipientAddress,
        onChainValue: chainMapped.recipientAddress,
        toleranceApplied: false,
      });
    }
  }

  private isMismatch(dbValue: bigint, chainValue: bigint): boolean {
    const diff = dbValue > chainValue ? dbValue - chainValue : chainValue - dbValue;
    return diff > this.tolerance;
  }
}
