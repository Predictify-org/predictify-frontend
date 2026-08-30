"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWallet } from '@/hooks/useWallet.hook';
import { toast } from '@/hooks/use-toast';
import {
  pollForConfirmation,
  submitTransaction,
} from '@/lib/stellar/transaction';
import {
  normalizeContractError,
  normalizeFromFailureType,
} from '@/lib/stellar/contract-error-normalizer';

export type TransactionStatus =
  | 'idle'
  | 'signing'
  | 'submitting'
  | 'confirming'
  | 'success'
  | 'failed';

export type TransactionFailureType =
  | 'userRejected'
  | 'signFailed'
  | 'submitFailed'
  | 'confirmationFailed'
  | 'confirmationTimeout'
  | 'buildFailed'
  | 'requestFailed';

export interface UseTransactionResult {
  status: TransactionStatus;
  transactionHash: string | null;
  transactionError: string | null;
  failureType: TransactionFailureType | null;
  executeTransaction: (buildXdr: () => Promise<string> | string) => Promise<{
    success: boolean;
    hash?: string;
    error?: string;
    failureType?: TransactionFailureType;
  }>;
  retryTransaction: () => Promise<{
    success: boolean;
    hash?: string;
    error?: string;
    failureType?: TransactionFailureType;
  }>;
  canRetry: boolean;
  resetTransaction: () => void;
}

function isUserRejectedError(message: string) {
  return /reject|denied|cancel|cancelled|user aborted/i.test(message);
}

export const useTransaction = (): UseTransactionResult => {
  const { signTransaction, isConnected, identityGeneration } = useWallet();
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [failureType, setFailureType] = useState<TransactionFailureType | null>(null);

  const lastBuildXdrRef = useRef<(() => Promise<string> | string) | null>(null);
  const lastSignedXdrRef = useRef<string | null>(null);
  const lastSubmittedHashRef = useRef<string | null>(null);
  const retryIdentityGenerationRef = useRef(identityGeneration);

  const resetTransaction = useCallback(() => {
    setStatus('idle');
    setTransactionHash(null);
    setTransactionError(null);
    setFailureType(null);
    lastBuildXdrRef.current = null;
    lastSignedXdrRef.current = null;
    lastSubmittedHashRef.current = null;
    retryIdentityGenerationRef.current = identityGeneration;
  }, [identityGeneration]);

  const previousIdentityGenerationRef = useRef(identityGeneration);
  useEffect(() => {
    if (previousIdentityGenerationRef.current !== identityGeneration) {
      // Signed payloads and retry callbacks are privileged to the identity that created them.
      resetTransaction();
      previousIdentityGenerationRef.current = identityGeneration;
    }
  }, [identityGeneration, resetTransaction]);

  const executeTransaction = useCallback(
    async (buildXdr: () => Promise<string> | string) => {
      setTransactionError(null);
      setFailureType(null);
      setTransactionHash(null);

      lastBuildXdrRef.current = buildXdr;
      lastSignedXdrRef.current = null;
      lastSubmittedHashRef.current = null;
      retryIdentityGenerationRef.current = identityGeneration;

      if (!isConnected) {
        const error = 'Connect a wallet before submitting a transaction.';
        setStatus('failed');
        setTransactionError(error);
        setFailureType('requestFailed');
        toast({ title: 'Wallet required', description: error, variant: 'destructive' });
        return { success: false, error, failureType: 'requestFailed' as TransactionFailureType };
      }

      try {
        setStatus('signing');
        toast({
          title: 'Signing transaction',
          description: 'Approve the transaction in your wallet.',
        });

        const xdr = await Promise.resolve(buildXdr());
        const signResult = await signTransaction(xdr);

        if (!signResult.success) {
          const rawError = signResult.error ?? 'Transaction signing failed';
          const userRejected = isUserRejectedError(rawError);
          const ft: TransactionFailureType = userRejected ? 'userRejected' : 'signFailed';
          // Normalize for toast display; keep raw error in state for diagnostics
          const normalized = normalizeFromFailureType(ft, rawError);
          setStatus('failed');
          setTransactionError(rawError);
          setFailureType(ft);
          toast({
            title: normalized.title,
            description: normalized.description,
            variant: 'destructive',
          });
          return { success: false, error: rawError, failureType: ft };
        }

        lastSignedXdrRef.current = signResult.signedTxXdr!;

        setStatus('submitting');
        toast({
          title: 'Submitting transaction',
          description: 'Broadcasting signed transaction to the Stellar network.',
        });

        const submissionResult = await submitTransaction(signResult.signedTxXdr!);
        if (!submissionResult.success) {
          // error from submitTransaction is already normalized by transaction.ts
          const error = submissionResult.error;
          setStatus('failed');
          setTransactionError(error);
          setFailureType('submitFailed');
          const normalized = normalizeFromFailureType('submitFailed', error);
          toast({
            title: normalized.title,
            description: normalized.description,
            variant: 'destructive',
          });
          return {
            success: false,
            error,
            failureType: 'submitFailed' as TransactionFailureType,
          };
        }

        lastSubmittedHashRef.current = submissionResult.hash;

        setStatus('confirming');
        toast({
          title: 'Confirming transaction',
          description: 'Waiting for the transaction to appear on the network.',
        });

        const confirmationResult = await pollForConfirmation(submissionResult.hash);
        if (!confirmationResult.success) {
          const ft: TransactionFailureType =
            confirmationResult.status === 'confirmationTimeout'
              ? 'confirmationTimeout'
              : 'confirmationFailed';
          setStatus('failed');
          setTransactionError(confirmationResult.error);
          setFailureType(ft);
          const normalized = normalizeFromFailureType(ft, confirmationResult.error);
          toast({
            title: normalized.title,
            description: normalized.description,
            variant: 'destructive',
          });
          return {
            success: false,
            error: confirmationResult.error,
            failureType: ft,
          };
        }

        setStatus('success');
        setTransactionHash(confirmationResult.hash);
        toast({
          title: 'Transaction confirmed',
          description: `Hash: ${confirmationResult.hash}`,
        });
        return { success: true, hash: confirmationResult.hash };
      } catch (error: unknown) {
        const rawMessage = (error as Error)?.message || 'Unknown transaction error';
        const normalized = normalizeContractError(rawMessage);
        setStatus('failed');
        setTransactionError(rawMessage);
        setFailureType('requestFailed');
        toast({
          title: normalized.title,
          description: normalized.description,
          variant: 'destructive',
        });
        return { success: false, error: rawMessage, failureType: 'requestFailed' as TransactionFailureType };
      }
    },
    [identityGeneration, isConnected, signTransaction],
  );

  const retryTransaction = useCallback(async () => {
    if (retryIdentityGenerationRef.current !== identityGeneration) {
      resetTransaction();
      return { success: false, error: 'Wallet identity changed. Start a new transaction.', failureType: 'requestFailed' as TransactionFailureType };
    }
    if (status !== 'failed' || !failureType) {
      return { success: false, error: 'No failed transaction to retry', failureType: 'requestFailed' as TransactionFailureType };
    }

    setTransactionError(null);
    setFailureType(null);

    try {
      if (failureType === 'confirmationTimeout' && lastSubmittedHashRef.current) {
        setStatus('confirming');
        toast({
          title: 'Retrying confirmation',
          description: 'Continuing to wait for the transaction to appear on the network.',
        });

        const confirmationResult = await pollForConfirmation(lastSubmittedHashRef.current);
        if (!confirmationResult.success) {
          const ft: TransactionFailureType =
            confirmationResult.status === 'confirmationTimeout'
              ? 'confirmationTimeout'
              : 'confirmationFailed';
          setStatus('failed');
          setTransactionError(confirmationResult.error);
          setFailureType(ft);
          const normalized = normalizeFromFailureType(ft, confirmationResult.error);
          toast({
            title: normalized.title,
            description: normalized.description,
            variant: 'destructive',
          });
          return {
            success: false,
            error: confirmationResult.error,
            failureType: ft,
          };
        }

        setStatus('success');
        setTransactionHash(confirmationResult.hash);
        toast({
          title: 'Transaction confirmed',
          description: `Hash: ${confirmationResult.hash}`,
        });
        return { success: true, hash: confirmationResult.hash };
      }

      if ((failureType === 'submitFailed' || failureType === 'confirmationFailed') && lastSignedXdrRef.current) {
        setStatus('submitting');
        toast({
          title: 'Retrying submission',
          description: 'Re-broadcasting signed transaction to the Stellar network.',
        });

        const submissionResult = await submitTransaction(lastSignedXdrRef.current);
        if (!submissionResult.success) {
          const error = submissionResult.error;
          setStatus('failed');
          setTransactionError(error);
          setFailureType('submitFailed');
          const normalized = normalizeFromFailureType('submitFailed', error);
          toast({
            title: normalized.title,
            description: normalized.description,
            variant: 'destructive',
          });
          return {
            success: false,
            error,
            failureType: 'submitFailed' as TransactionFailureType,
          };
        }

        lastSubmittedHashRef.current = submissionResult.hash;

        setStatus('confirming');
        toast({
          title: 'Confirming transaction',
          description: 'Waiting for the transaction to appear on the network.',
        });

        const confirmationResult = await pollForConfirmation(submissionResult.hash);
        if (!confirmationResult.success) {
          const ft: TransactionFailureType =
            confirmationResult.status === 'confirmationTimeout'
              ? 'confirmationTimeout'
              : 'confirmationFailed';
          setStatus('failed');
          setTransactionError(confirmationResult.error);
          setFailureType(ft);
          const normalized = normalizeFromFailureType(ft, confirmationResult.error);
          toast({
            title: normalized.title,
            description: normalized.description,
            variant: 'destructive',
          });
          return {
            success: false,
            error: confirmationResult.error,
            failureType: ft,
          };
        }

        setStatus('success');
        setTransactionHash(confirmationResult.hash);
        toast({
          title: 'Transaction confirmed',
          description: `Hash: ${confirmationResult.hash}`,
        });
        return { success: true, hash: confirmationResult.hash };
      }

      if (lastBuildXdrRef.current) {
        return executeTransaction(lastBuildXdrRef.current);
      }

      const message = 'Cannot retry: Missing transaction data';
      setStatus('failed');
      setTransactionError(message);
      setFailureType('requestFailed');
      return { success: false, error: message, failureType: 'requestFailed' as TransactionFailureType };

    } catch (error: unknown) {
      const rawMessage = (error as Error)?.message || 'Unknown transaction error';
      const normalized = normalizeContractError(rawMessage);
      setStatus('failed');
      setTransactionError(rawMessage);
      setFailureType('requestFailed');
      toast({
        title: normalized.title,
        description: normalized.description,
        variant: 'destructive',
      });
      return { success: false, error: rawMessage, failureType: 'requestFailed' as TransactionFailureType };
    }
  }, [executeTransaction, failureType, identityGeneration, resetTransaction, status]);

  const canRetry = status === 'failed' && (
    lastBuildXdrRef.current !== null ||
    lastSignedXdrRef.current !== null ||
    lastSubmittedHashRef.current !== null
  );

  return {
    status,
    transactionHash,
    transactionError,
    failureType,
    executeTransaction,
    retryTransaction,
    canRetry,
    resetTransaction,
  };
};
