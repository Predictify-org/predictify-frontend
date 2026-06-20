"use client";

import { useCallback, useState } from 'react';
import { useWallet } from '@/hooks/useWallet.hook';
import { toast } from '@/hooks/use-toast';
import {
  pollForConfirmation,
  submitTransaction,
} from '@/lib/stellar/transaction';

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
  resetTransaction: () => void;
}

function isUserRejectedError(message: string) {
  return /reject|denied|cancel|cancelled|user aborted/i.test(message);
}

export const useTransaction = (): UseTransactionResult => {
  const { signTransaction, isConnected } = useWallet();
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [failureType, setFailureType] = useState<TransactionFailureType | null>(null);

  const resetTransaction = useCallback(() => {
    setStatus('idle');
    setTransactionHash(null);
    setTransactionError(null);
    setFailureType(null);
  }, []);

  const executeTransaction = useCallback(
    async (buildXdr: () => Promise<string> | string) => {
      setTransactionError(null);
      setFailureType(null);
      setTransactionHash(null);

      if (!isConnected) {
        const error = 'Connect a wallet before submitting a transaction.';
        setStatus('failed');
        setTransactionError(error);
        setFailureType('requestFailed');
        toast({ title: 'Wallet required', description: error, variant: 'destructive' });
        return { success: false, error, failureType: 'requestFailed' };
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
          const error = signResult.error ?? 'Transaction signing failed';
          const userRejected = isUserRejectedError(error);
          setStatus('failed');
          setTransactionError(error);
          setFailureType(userRejected ? 'userRejected' : 'signFailed');
          toast({
            title: userRejected ? 'Transaction rejected' : 'Signing failed',
            description: error,
            variant: 'destructive',
          });
          return {
            success: false,
            error,
            failureType: userRejected ? 'userRejected' : 'signFailed',
          };
        }

        setStatus('submitting');
        toast({
          title: 'Submitting transaction',
          description: 'Broadcasting signed transaction to the Stellar network.',
        });

        const submissionResult = await submitTransaction(signResult.signedTxXdr);
        if (!submissionResult.success) {
          const error = submissionResult.error;
          setStatus('failed');
          setTransactionError(error);
          setFailureType('submitFailed');
          toast({
            title: 'Submission failed',
            description: error,
            variant: 'destructive',
          });
          return {
            success: false,
            error,
            failureType: 'submitFailed',
          };
        }

        setStatus('confirming');
        toast({
          title: 'Confirming transaction',
          description: 'Waiting for the transaction to appear on the network.',
        });

        const confirmationResult = await pollForConfirmation(submissionResult.hash);
        if (!confirmationResult.success) {
          const failure = confirmationResult.status === 'confirmationTimeout'
            ? 'confirmationTimeout'
            : 'confirmationFailed';
          setStatus('failed');
          setTransactionError(confirmationResult.error);
          setFailureType(failure as TransactionFailureType);
          toast({
            title: failure === 'confirmationTimeout' ? 'Confirmation timed out' : 'Confirmation failed',
            description: confirmationResult.error,
            variant: 'destructive',
          });
          return {
            success: false,
            error: confirmationResult.error,
            failureType: failure as TransactionFailureType,
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
        const message = (error as Error)?.message || 'Unknown transaction error';
        setStatus('failed');
        setTransactionError(message);
        setFailureType('requestFailed');
        toast({
          title: 'Transaction failed',
          description: message,
          variant: 'destructive',
        });
        return { success: false, error: message, failureType: 'requestFailed' };
      }
    },
    [isConnected, signTransaction],
  );

  return {
    status,
    transactionHash,
    transactionError,
    failureType,
    executeTransaction,
    resetTransaction,
  };
};
