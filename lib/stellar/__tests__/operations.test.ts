import { fetchAccountOperations } from '@/lib/stellar/operations';

const TEST_ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const OTHER_ADDRESS = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

describe('fetchAccountOperations', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fetches and normalizes payment, create_account, and invoke_host_function operations with nextCursor', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        _embedded: {
          records: [
            {
              id: 'op-3',
              paging_token: '300',
              type: 'payment',
              created_at: '2026-05-10T12:00:00Z',
              transaction_hash: 'hash-3',
              transaction_successful: true,
              from: OTHER_ADDRESS,
              to: TEST_ADDRESS,
              amount: '25.5000000',
              asset_type: 'native',
            },
            {
              id: 'op-2',
              paging_token: '200',
              type: 'invoke_host_function',
              created_at: '2026-05-09T12:00:00Z',
              transaction_hash: 'hash-2',
              transaction_successful: true,
              function: 'claim_winnings',
              amount: '12.00',
              asset_type: 'credit_alphanum4',
              asset_code: 'USDC',
            },
            {
              id: 'op-1',
              paging_token: '100',
              type: 'create_account',
              created_at: '2026-05-08T12:00:00Z',
              transaction_hash: 'hash-1',
              transaction_successful: true,
              account: TEST_ADDRESS,
              funder: OTHER_ADDRESS,
              starting_balance: '100.0000000',
            },
          ],
        },
        _links: {
          next: {
            href: `https://horizon-testnet.stellar.org/accounts/${TEST_ADDRESS}/operations?cursor=100&limit=20&order=desc`,
          },
        },
      }),
    });

    const controller = new AbortController();
    const result = await fetchAccountOperations({
      address: TEST_ADDRESS,
      limit: 20,
      signal: controller.signal,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/accounts/${TEST_ADDRESS}/operations?order=desc&limit=20`),
      { signal: controller.signal }
    );
    expect(result.nextCursor).toBe('100');
    expect(result.records).toHaveLength(3);

    expect(result.records[0]).toMatchObject({
      id: 'op-3',
      hash: 'hash-3',
      type: 'deposit',
      currency: 'XLM',
      amount: '+25.50 XLM',
      status: 'completed',
      icon: 'down',
    });

    expect(result.records[1]).toMatchObject({
      id: 'op-2',
      hash: 'hash-2',
      type: 'win',
      currency: 'USDC',
      amount: '12.00 USDC',
      status: 'completed',
      icon: 'down',
    });

    expect(result.records[2]).toMatchObject({
      id: 'op-1',
      hash: 'hash-1',
      type: 'deposit',
      currency: 'XLM',
      amount: '+100.00 XLM',
      status: 'completed',
    });
  });

  it('returns empty records and null nextCursor on 404 unfunded account', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ status: 404, title: 'Resource Missing' }),
    });

    const result = await fetchAccountOperations({ address: TEST_ADDRESS });
    expect(result).toEqual({ records: [], nextCursor: null });
  });

  it('returns null nextCursor for an empty page even when Horizon includes a next link', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        _embedded: { records: [] },
        _links: {
          next: {
            href: `https://horizon-testnet.stellar.org/accounts/${TEST_ADDRESS}/operations?cursor=999&limit=20&order=desc`,
          },
        },
      }),
    });

    const result = await fetchAccountOperations({
      address: TEST_ADDRESS,
      cursor: '100',
    });

    expect(result).toEqual({ records: [], nextCursor: null });
  });

  it('skips malformed records while keeping valid records', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        _embedded: {
          records: [
            { id: 'bad-record' }, // missing required fields
            {
              id: 'op-valid',
              paging_token: '500',
              type: 'payment',
              created_at: '2026-05-11T10:00:00Z',
              transaction_hash: 'hash-valid',
              from: TEST_ADDRESS,
              to: OTHER_ADDRESS,
              amount: '5.00',
              asset_type: 'native',
            },
          ],
        },
        _links: {},
      }),
    });

    const result = await fetchAccountOperations({ address: TEST_ADDRESS });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe('op-valid');
    expect(result.records[0].type).toBe('withdraw');
    expect(result.nextCursor).toBeNull();
  });

  it('throws on 429 rate limit and 500 server errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    await expect(fetchAccountOperations({ address: TEST_ADDRESS })).rejects.toThrow(
      /Rate limit exceeded/i
    );

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchAccountOperations({ address: TEST_ADDRESS })).rejects.toThrow(
      /500/
    );
  });
});
