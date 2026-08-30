import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockSign = jest.fn();
const mockSubmit = jest.fn();
const mockPoll = jest.fn();

jest.mock('@/hooks/useWallet.hook', () => ({
  useWallet: () => ({
    signTransaction: mockSign,
    isConnected: true,
    walletAddress: 'GABC',
  }),
}));

jest.mock('@/lib/stellar/transaction', () => ({
  submitTransaction: (...args: any[]) => mockSubmit(...args),
  pollForConfirmation: (...args: any[]) => mockPoll(...args),
}));

import { useTransaction } from '../useTransaction.hook';

function TestHarness({ buildXdr }: { buildXdr: () => Promise<string> | string }) {
  const { executeTransaction } = useTransaction();
  const [out, setOut] = useState<any>(null);
  return (
    <div>
      <button onClick={async () => setOut(await executeTransaction(buildXdr))}>go</button>
      <div data-testid="out">{out ? JSON.stringify(out) : ''}</div>
    </div>
  );
}

describe('useTransaction hook', () => {
  beforeEach(() => {
    mockSign.mockReset();
    mockSubmit.mockReset();
    mockPoll.mockReset();
    // clear intents storage
    try { localStorage.removeItem('predictify:intents:v1'); } catch {}
  });

  it('successful sign -> submit -> confirm', async () => {
    mockSign.mockResolvedValue({ success: true, signedTxXdr: 'signed-xdr' });
    mockSubmit.mockResolvedValue({ success: true, hash: 'txhash' });
    mockPoll.mockResolvedValue({ success: true, hash: 'txhash' });

    render(<TestHarness buildXdr={() => 'built-xdr'} />);
    fireEvent.click(screen.getByText(/go/i));

    await waitFor(() => expect(screen.getByTestId('out').textContent).toContain('txhash'));
    expect(mockSign).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith('signed-xdr');
  });

  it('reuses stored signedXdr on retry when submit previously failed', async () => {
    // First run: sign ok, submit fails
    mockSign.mockResolvedValueOnce({ success: true, signedTxXdr: 'signed-xdr' });
    mockSubmit.mockResolvedValueOnce({ success: false, error: 'net' });

    render(<TestHarness buildXdr={() => 'built-xdr'} />);
    fireEvent.click(screen.getByText(/go/i));

    await waitFor(() => expect(screen.getByTestId('out').textContent).toContain('net'));

    // Now prepare for retry: sign should NOT be called, submit should succeed
    mockSign.mockReset();
    mockSign.mockImplementation(() => { throw new Error('should not sign'); });
    mockSubmit.mockResolvedValueOnce({ success: true, hash: 'txhash2' });
    mockPoll.mockResolvedValueOnce({ success: true, hash: 'txhash2' });

    // click again to retry
    fireEvent.click(screen.getByText(/go/i));

    await waitFor(() => expect(screen.getByTestId('out').textContent).toContain('txhash2'));
    // ensure submit was called again for retry
    expect(mockSubmit.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
