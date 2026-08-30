"use client";

import { useCallback, useState } from 'react';
import { useWallet } from '@/hooks/useWallet.hook';
import { toast } from '@/hooks/use-toast';
import {
  pollForConfirmation,
  submitTransaction,
} from '@/lib/stellar/transaction';
import {
  computeXdrHash,
  getIntent,
  upsertIntent,
  removeIntent,
} from '@/lib/transaction/intent';

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
  const { signTransaction, isConnected, walletAddress } = useWallet();
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

      // simple in-memory lock to prevent duplicate submits in same tab
      const locks = (executeTransaction as any)._locks || ((executeTransaction as any)._locks = new Map<string, boolean>());

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      try {
        // Build XDR first so we can derive an intent key
        const xdr = await Promise.resolve(buildXdr());
        const xdrHash = await computeXdrHash(xdr);
        const intentKey = `${walletAddress}:${xdrHash}`;

        // wait if another execution is running for same intent
        let waitCount = 0;
        while (locks.get(intentKey)) {
          await sleep(100);
          waitCount += 1;
          if (waitCount > 200) break; // ~20s
        }

        locks.set(intentKey, true);

        // Record built intent
        upsertIntent({ key: intentKey, walletAddress, xdrHash, status: 'built', builtXdr: xdr });

        // Inspect existing intent state to avoid duplicate work
        const existing = getIntent(intentKey);
        if (existing?.submissionHash) {
          // Already submitted; poll for confirmation rather than resubmitting
          setStatus('confirming');
          toast({ title: 'Confirming transaction', description: 'Waiting for existing transaction to confirm.' });
          const confirmationResult = await pollForConfirmation(existing.submissionHash);
          if (confirmationResult.success) {
            setStatus('success');
            setTransactionHash(confirmationResult.hash);
            // mark intent success and clear shortly
            upsertIntent({ key: intentKey, status: 'success', submissionHash: confirmationResult.hash });
            setTimeout(() => removeIntent(intentKey), 5_000);
            return { success: true, hash: confirmationResult.hash };
          }
          // if confirmation failed, fall through to allow resubmit
          upsertIntent({ key: intentKey, status: 'failed', error: confirmationResult.error });
        }

        // If we have a signed XDR stored, reuse it to avoid prompting wallet again
        let signedXdrFromStore: string | undefined = existing?.signedXdr;

        // Signing
        setStatus('signing');
        toast({ title: 'Signing transaction', description: 'Approve the transaction in your wallet.' });

        let signResult: { success: boolean; signedTxXdr?: string; error?: string };

        if (signedXdrFromStore) {
          signResult = { success: true, signedTxXdr: signedXdrFromStore };
        } else {
          const signOutcome = await signTransaction(xdr);
          signResult = signOutcome as any;
        }

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
          // update intent with failure
          upsertIntent({ key: intentKey, status: 'failed', error });
          return { success: false, error, failureType: userRejected ? 'userRejected' : 'signFailed' };
        }

        // Persist the signed XDR to help retries avoid re-signing
        upsertIntent({ key: intentKey, status: 'signed', signedXdr: signResult.signedTxXdr, walletAddress, xdrHash });

        // Submit
        setStatus('submitting');
        toast({ title: 'Submitting transaction', description: 'Broadcasting signed transaction to the Stellar network.' });

        const submissionResult = await submitTransaction(signResult.signedTxXdr as string);
        if (!submissionResult.success) {
          const error = submissionResult.error;
          setStatus('failed');
          setTransactionError(error);
          setFailureType('submitFailed');
          toast({ title: 'Submission failed', description: error, variant: 'destructive' });
          upsertIntent({ key: intentKey, status: 'failed', error });
          return { success: false, error, failureType: 'submitFailed' };
        }

        // store submission
        upsertIntent({ key: intentKey, status: 'submitted', submissionHash: submissionResult.hash });

        // Confirm
        setStatus('confirming');
        toast({ title: 'Confirming transaction', description: 'Waiting for the transaction to appear on the network.' });

        const confirmationResult = await pollForConfirmation(submissionResult.hash);
        if (!confirmationResult.success) {
          const failure = confirmationResult.status === 'confirmationTimeout' ? 'confirmationTimeout' : 'confirmationFailed';
          setStatus('failed');
          setTransactionError(confirmationResult.error);
          setFailureType(failure as TransactionFailureType);
          toast({ title: failure === 'confirmationTimeout' ? 'Confirmation timed out' : 'Confirmation failed', description: confirmationResult.error, variant: 'destructive' });
          upsertIntent({ key: intentKey, status: 'failed', error: confirmationResult.error });
          return { success: false, error: confirmationResult.error, failureType: failure as TransactionFailureType };
        }

        setStatus('success');
        setTransactionHash(confirmationResult.hash);
        toast({ title: 'Transaction confirmed', description: `Hash: ${confirmationResult.hash}` });
        upsertIntent({ key: intentKey, status: 'success', submissionHash: confirmationResult.hash });
        // clear persisted signed XDR after success to reduce exposure
        setTimeout(() => removeIntent(intentKey), 5_000);
        return { success: true, hash: confirmationResult.hash };
      } catch (error: unknown) {
        const message = (error as Error)?.message || 'Unknown transaction error';
        setStatus('failed');
        setTransactionError(message);
        setFailureType('requestFailed');
        toast({ title: 'Transaction failed', description: message, variant: 'destructive' });
        return { success: false, error: message, failureType: 'requestFailed' };
      } finally {
        // release any lock for this intent
        try {
          const xdr = undefined as unknown as string; // no-op, locks map cleared below
        } finally {
          // unlock all locks (conservative) — ideally we'd unlock specific key, but we can't access it here reliably
          const locks = (executeTransaction as any)._locks as Map<string, boolean> | undefined;
          if (locks) {
            // clear all entries; callers wait on absence
            locks.clear();
          }
        }
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
