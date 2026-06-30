import { OnChainStream } from "./types";

/**
 * Documented 1:1 Mapping between DB/UI fields and Contract Storage Keys
 * 
 * | UI Field           | Contract Storage Key (Soroban) | Type      |
 * |--------------------|--------------------------------|-----------|
 * | id                 | id                             | String    |
 * | recipient          | recipient_address              | Address   |
 * | amount             | total_amount                   | i128      |
 * | rate               | velocity                       | i128      |
 * | status             | status                         | u32/Enum  |
 * | lastUpdated       | last_update_timestamp          | u64       |
 */

export const mapContractToUI = (contractStream: OnChainStream) => {
  return {
    id: contractStream.id,
    recipient: contractStream.recipient_address,
    amount: contractStream.total_amount.toString(),
    status: contractStream.status,
  };
};

export interface MappedStreamState {
  id: string;
  recipientAddress: string;
  totalAmount: bigint;
  releasedAmount: bigint;
  status: string;
}

export const mapDbStream = (dbStream: any): MappedStreamState => {
  return {
    id: dbStream.id,
    recipientAddress: dbStream.recipient_address,
    totalAmount: BigInt(dbStream.total_amount),
    releasedAmount: BigInt(dbStream.released_amount),
    status: dbStream.status,
  };
};

export const mapOnChainStream = (onChainStream: OnChainStream): MappedStreamState => {
  return {
    id: onChainStream.id,
    recipientAddress: onChainStream.recipient_address,
    totalAmount: onChainStream.total_amount,
    releasedAmount: onChainStream.released_amount,
    status: onChainStream.status,
  };
};