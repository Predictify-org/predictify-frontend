
export interface DbStream {
  id: string;
  recipient_address: string;
  total_amount: string; // Stored as string in DB to avoid precision loss
  released_amount: string;
  status: string;
  last_sync_ledger: number;
}

export interface ReconciliationDiff {
  streamId: string;
  field: string;
  dbValue: string | bigint | number;
  onChainValue: string | bigint | number;
  toleranceApplied: boolean;
}

export interface ReconciliationReport {
  timestamp: string;
  totalStreamsChecked: number;
  mismatches: ReconciliationDiff[];
  errors: { streamId: string; error: string }[];
  status: 'SUCCESS' | 'MISMATCH_FOUND' | 'FAILED';
}
