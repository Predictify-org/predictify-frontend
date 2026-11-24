import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionsHistory, {
  toggleFilterValue,
} from '@/components/transactions/TransactionsHistory';
import { useWallet } from '@/hooks/useWallet.hook';
import type { TransactionFilters } from '@/lib/types';

jest.mock('@/hooks/useWallet.hook', () => ({
  useWallet: jest.fn(),
}));

jest.mock('@/context/PrivacyContext', () => ({
  usePrivacy: () => ({ hideBalances: false, setHideBalances: jest.fn() }),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const WALLET_A = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const WALLET_B = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

function mockWalletState(overrides: Partial<ReturnType<typeof useWallet>> = {}) {
  mockUseWallet.mockReturnValue({
    connectWallet: jest.fn(),
    disconnectWallet: jest.fn(),
    signTransaction: jest.fn(),
    isConnecting: false,
    isDisconnecting: false,
    isOperationPending: false,
    operationStatus: 'idle',
    activeOperationId: null,
    error: null,
    errorKind: null,
    clearError: jest.fn(),
    identityGeneration: 1,
    isConnected: true,
    walletAddress: WALLET_A,
    walletName: 'Freighter',
    ...overrides,
  });
}

describe('toggleFilterValue', () => {
  it('toggles filter values cleanly under rapid toggles', () => {
    const initial: TransactionFilters = {
      type: [],
      status: [],
      currency: [],
      dateFrom: '',
      dateTo: '',
    };

    let state = toggleFilterValue(initial, 'type', 'deposit');
    expect(state.type).toEqual(['deposit']);

    state = toggleFilterValue(state, 'type', 'withdraw');
    expect(state.type).toEqual(['deposit', 'withdraw']);

    state = toggleFilterValue(state, 'type', 'deposit');
    expect(state.type).toEqual(['withdraw']);

    state = toggleFilterValue(state, 'type', 'withdraw');
    expect(state.type).toEqual([]);
  });
});

describe('TransactionsHistory', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('shows wallet-not-connected state when disconnected', () => {
    mockWalletState({ isConnected: false, walletAddress: null });
    render(<TransactionsHistory />);

    expect(
      screen.getByText(/Connect your wallet to view transactions/i)
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows empty state (not error) for 404 unfunded account', async () => {
    mockWalletState();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ status: 404 }),
    });

    render(<TransactionsHistory />);

    await waitFor(() => {
      expect(screen.getByText(/No transactions yet/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows error state with retry and recovers on retry', async () => {
    const user = userEvent.setup();
    mockWalletState();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _embedded: {
            records: [
              {
                id: 'op-retry-1',
                paging_token: '10',
                type: 'payment',
                created_at: '2026-05-10T10:00:00Z',
                transaction_hash: 'hash-retry-1',
                from: WALLET_B,
                to: WALLET_A,
                amount: '15.00',
                asset_type: 'native',
              },
            ],
          },
          _links: {},
        }),
      });

    render(<TransactionsHistory />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getByText('+15.00 XLM')).toBeInTheDocument();
    });
  });

  it('loads operations newest first, appends next page on Load more without duplicates, and handles rapid filter toggling', async () => {
    const user = userEvent.setup();
    mockWalletState();

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _embedded: {
            records: [
              {
                id: 'op-2',
                paging_token: '200',
                type: 'payment',
                created_at: '2026-05-11T10:00:00Z',
                transaction_hash: 'hash-2',
                from: WALLET_B,
                to: WALLET_A,
                amount: '50.00',
                asset_type: 'native',
              },
            ],
          },
          _links: {
            next: {
              href: `https://horizon-testnet.stellar.org/accounts/${WALLET_A}/operations?cursor=200&limit=20&order=desc`,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _embedded: {
            records: [
              // Duplicate op-2 should be ignored
              {
                id: 'op-2',
                paging_token: '200',
                type: 'payment',
                created_at: '2026-05-11T10:00:00Z',
                transaction_hash: 'hash-2',
                from: WALLET_B,
                to: WALLET_A,
                amount: '50.00',
                asset_type: 'native',
              },
              {
                id: 'op-1',
                paging_token: '100',
                type: 'payment',
                created_at: '2026-05-10T10:00:00Z',
                transaction_hash: 'hash-1',
                from: WALLET_A,
                to: WALLET_B,
                amount: '10.00',
                asset_type: 'credit_alphanum4',
                asset_code: 'USDC',
              },
            ],
          },
          _links: {},
        }),
      });

    render(<TransactionsHistory />);

    await waitFor(() => {
      expect(screen.getByText('+50.00 XLM')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Load more/i }));

    await waitFor(() => {
      expect(screen.getByText('-10.00 USDC')).toBeInTheDocument();
    });

    // No duplicate rows for op-2
    expect(screen.getAllByText('+50.00 XLM')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Load more/i })).not.toBeInTheDocument();

    // Open filter panel and rapidly toggle filters
    await user.click(screen.getByRole('button', { name: /Filter/i }));
    const withdrawCheckbox = screen.getByLabelText(/withdraw/i);
    await user.click(withdrawCheckbox);
    expect(screen.queryByText('+50.00 XLM')).not.toBeInTheDocument();
    expect(screen.getByText('-10.00 USDC')).toBeInTheDocument();

    await user.click(withdrawCheckbox);
    await user.click(withdrawCheckbox);
    await user.click(withdrawCheckbox);
    expect(screen.getByText('+50.00 XLM')).toBeInTheDocument();
    expect(screen.getByText('-10.00 USDC')).toBeInTheDocument();
  });

  it('aborts in-flight requests when switching wallets', async () => {
    let firstSignal: AbortSignal | undefined;

    (global.fetch as jest.Mock)
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        firstSignal = init?.signal ?? undefined;
        return new Promise(() => {
          // Intentionally unresolved to simulate in-flight request
        });
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          _embedded: {
            records: [
              {
                id: 'op-wallet-b',
                paging_token: '1',
                type: 'payment',
                created_at: '2026-05-12T10:00:00Z',
                transaction_hash: 'hash-b',
                from: WALLET_A,
                to: WALLET_B,
                amount: '99.00',
                asset_type: 'native',
              },
            ],
          },
          _links: {},
        }),
      });

    mockWalletState({ walletAddress: WALLET_A });
    const { rerender } = render(<TransactionsHistory />);

    await waitFor(() => {
      expect(firstSignal).toBeDefined();
    });
    expect(firstSignal?.aborted).toBe(false);

    mockWalletState({ walletAddress: WALLET_B });
    rerender(<TransactionsHistory />);

    expect(firstSignal?.aborted).toBe(true);

    await waitFor(() => {
      expect(screen.getByText('+99.00 XLM')).toBeInTheDocument();
    });
  });
});
