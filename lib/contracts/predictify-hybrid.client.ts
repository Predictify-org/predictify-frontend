// AUTO-GENERATED - do not edit
import type { ContractAddress } from './predictify-hybrid.types';

export interface InvokeDescriptor<TMethod extends string = string, TArgs extends Record<string, unknown> = Record<string, unknown>> {
  contractId: ContractAddress;
  method: TMethod;
  args: TArgs;
}

export function recover(
  contractId: ContractAddress,
  args: {
    market_ids: Array<bigint>;
  },
): InvokeDescriptor<'recover', {
    market_ids: Array<bigint>;
  }> {
  return { contractId, method: 'recover', args };
}

export function recoverDryRun(
  contractId: ContractAddress,
  args: {
    market_ids: Array<bigint>;
  },
): InvokeDescriptor<'recover_dry_run', {
    market_ids: Array<bigint>;
  }> {
  return { contractId, method: 'recover_dry_run', args };
}
