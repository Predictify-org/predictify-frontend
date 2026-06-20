import React, { useEffect, useRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockSignTransaction = jest.fn();
const mockToast = jest.fn();

jest.mock('@/hooks/useWallet.hook', () => ({
  useWallet: () => ({
    signTransaction: mockSignTransaction,
    isConnected: true,
  }),
}));

jest.mock('@/hooks/use-toast', () => ({ toast: (props: { title: string }) => {
  mockToast(props);
  return { id: 'toast-id', dismiss: jest.fn(), update: jest.fn() };
}}));

import { useTransaction } from '@/hooks/useTransaction.hook';

function TestComponent({ buildXdr }: { buildXdr: () => Promise<string> | string }) {
  const {
    status,
    transactionHash,
    transactionError,
    failureType,
    executeTransaction,
  } = useTransaction();

  const latest = useRef({ status, transactionHash, transactionError, failureType });
  latest.current = { status, transactionHash, transactionError, failureType };

  useEffect(() => {
    latest.current = { status, transactionHash, transactionError, failureType };
  }, [status, transactionHash, transactionError, failureType]);

  return (
    <div>
      <button onClick={() => void executeTransaction(buildXdr)}>submit</button>
      <div data-testid="status">{status}</div>
      <div data-testid="hash">{transactionHash ?? ''}</div>
      <div data-testid="error">{transactionError ?? ''}</div>
      <div data-testid="failureType">{failureType ?? ''}</div>
    </div>
  );
}

describe('useTransaction hook', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockSignTransaction.mockReset();
    mockToast.mockReset();
  });

  it('completes a transaction lifecycle successfully', async () => {
    mockSignTransaction.mockResolvedValue({ success: true, signedTxXdr: 'signed-xdr' });
    const originalFetch = (global as any).fetch;
    const responses = [
      Promise.resolve({ ok: true, json: async () => ({ hash: 'fakehash' }) }),
      Promise.resolve({ ok: true, status: 200, json: async () => ({ id: 'fakehash' }) }),
    ];
    (global as any).fetch = jest.fn().mockImplementation(() => responses.shift() as Promise<any>);

    render(<TestComponent buildXdr={() => 'xdr'} />);

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('success'));
    expect(screen.getByTestId('hash')).toHaveTextContent('fakehash');
    expect(screen.getByTestId('error')).toHaveTextContent('');
    expect(screen.getByTestId('failureType')).toHaveTextContent('');

    if (originalFetch !== undefined) {
      (global as any).fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
  });

  it('handles user rejected signing distinctly', async () => {
    mockSignTransaction.mockResolvedValue({ success: false, error: 'User rejected request' });

    render(<TestComponent buildXdr={() => 'xdr'} />);

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'));
    expect(screen.getByTestId('error')).toHaveTextContent('User rejected request');
    expect(screen.getByTestId('failureType')).toHaveTextContent('userRejected');
  });

  it('handles confirmation timeout distinctly', async () => {
    const originalFetch = (global as any).fetch;
    jest.useFakeTimers();
    mockSignTransaction.mockResolvedValue({ success: true, signedTxXdr: 'signed-xdr' });

    let callCount = 0;
    (global as any).fetch = jest.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: async () => ({ hash: 'fakehash' }) });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => null });
    });

    render(<TestComponent buildXdr={() => 'xdr'} />);

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(120_000);
    });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'));
    expect(screen.getByTestId('failureType')).toHaveTextContent('confirmationTimeout');

    jest.useRealTimers();
    if (originalFetch !== undefined) {
      (global as any).fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
  });
});
