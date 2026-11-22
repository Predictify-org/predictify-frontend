// AUTO-GENERATED - do not edit

export type ContractAddress = string;

export interface BalanceMutation {
  market_id: bigint;
  participant: string;
  before: bigint;
  after: bigint;
}

export interface Market {
  status: MarketStatus;
  expiration_ledger: number;
}

export type MarketStatus =
  | { tag: 'Active' }
  | { tag: 'Expired' };

export interface RecoveryEvent {
  market_id: bigint;
  total_recovered: bigint;
  num_participants: number;
}

export interface RecoveryPlan {
  markets_recovered: Array<bigint>;
  balances_mutated: Array<BalanceMutation>;
  events_summary: Array<RecoveryEvent>;
  total_tokens_recovered: bigint;
}

export type ContractError =
  | { name: 'NotInitialized' }
  | { name: 'TooManyMarkets' }
  | { name: 'PlanTooLarge' }
  | { name: 'Overflow' }
  | { name: 'MarketNotFound' };
export type ContractErrorCode = never;
