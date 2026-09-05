import React, { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum: any;
  }
}

const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_EXPECTED_CHAIN_ID || 1);
const DEFAULT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_BET_CONTRACT_ADDRESS || '';

const BET_ABI = [
  {
    inputs: [{ name: 'outcome', type: 'bytes32' }],
    name: 'placeBet',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

export interface ValidateBetInputArgs {
  account: string | null;
  chainId: number | null;
  outcome: string;
  amount: string;
  expectedChainId: number;
}

export function validateBetInput({
  account,
  chainId,
  outcome,
  amount,
  expectedChainId,
}: ValidateBetInputArgs): string | null {
  if (!account) return 'Please connect your wallet to place a bet.';
  if (chainId === null) return 'Unable to detect network. Please check your wallet.';
  if (chainId !== expectedChainId) {
    return `Wallet connected to unsupported network (chain ID ${chainId}). Please switch to chain ID ${expectedChainId}.`;
  }
  if (!outcome) return 'Please select a prediction outcome.';
  const parsedAmount = Number(amount);
  if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return 'Enter a valid amount to bet.';
  }
  return null;
}

async function defaultPlaceBet(outcome: string, amount: string): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum provider found. Please install MetaMask.');
  }
  if (!DEFAULT_CONTRACT_ADDRESS) {
    throw new Error('Bet contract address is not configured.');
  }
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const contract = new ethers.Contract(DEFAULT_CONTRACT_ADDRESS, BET_ABI, signer);
  const outcomeBytes = ethers.utils.formatBytes32String(outcome);
  const value = ethers.utils.parseEther(amount);
  const tx = await contract.placeBet(outcomeBytes, { value });
  await tx.wait();
}

export interface BetFormProps {
  expectedChainId?: number;
  onPlaceBet?: (outcome: string, amount: string) => Promise<void>;
}

export default function BetForm({
  expectedChainId = DEFAULT_CHAIN_ID,
  onPlaceBet = defaultPlaceBet,
}: BetFormProps) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [outcome, setOutcome] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getProvider = useCallback(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No Ethereum provider found. Please install MetaMask.');
    }
    return new ethers.providers.Web3Provider(window.ethereum);
  }, []);

  const refreshAccount = useCallback(async () => {
    try {
      const provider = getProvider();
      const accounts = await provider.listAccounts();
      setAccount(accounts[0] ?? null);
    } catch (err: any) {
      setError(err.message || 'Could not read wallet account.');
    }
  }, [getProvider]);

  const refreshNetwork = useCallback(async () => {
    try {
      const provider = getProvider();
      const network = await provider.getNetwork();
      setChainId(network.chainId);
    } catch (err: any) {
      setError(err.message || 'Could not read wallet network.');
    }
  }, [getProvider]);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    setAccount(accounts[0] ?? null);
  }, []);

  const handleChainChanged = useCallback((hexChainId: string) => {
    setChainId(parseInt(hexChainId, 16));
    refreshNetwork();
  }, [refreshNetwork]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    refreshAccount();
    refreshNetwork();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [refreshAccount, refreshNetwork, handleAccountsChanged, handleChainChanged]);

  useEffect(() => {
    setError(null);
  }, [account, chainId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    const validationError = validateBetInput({ account, chainId, outcome, amount, expectedChainId });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Re-check network right before signing to handle race conditions.
      const provider = getProvider();
      const network = await provider.getNetwork();
      if (network.chainId !== expectedChainId) {
        throw new Error(`Network changed before signing. Wallet is on chain ${network.chainId}, expected ${expectedChainId}.`);
      }
      await onPlaceBet(outcome, amount);
      setOutcome('');
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Place a Bet</h3>
      <label>
        <input
          type="radio"
          name="outcome"
          value="yes"
          checked={outcome === 'yes'}
          onChange={(e) => setOutcome(e.target.value)}
          disabled={loading}
        />
        Yes
      </label>
      <label>
        <input
          type="radio"
          name="outcome"
          value="no"
          checked={outcome === 'no'}
          onChange={(e) => setOutcome(e.target.value)}
          disabled={loading}
        />
        No
      </label>
      <div>
        <label htmlFor="amount">Amount (ETH</label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Signing...' : 'Place Bet'}
      </button>
      {error && <div role="alert">{error}</div>}
    </form>
  );
}
