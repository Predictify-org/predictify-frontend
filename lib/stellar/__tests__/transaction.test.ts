import { submitTransaction, pollForConfirmation } from '../transaction';

describe('transaction module', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('submits a signed XDR and returns the transaction hash', async () => {
    const originalFetch = (global as any).fetch;
    const fakeFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hash: 'fakehash' }),
    });
    (global as any).fetch = fakeFetch;

    const result = await submitTransaction('signed-xdr');

    expect(fakeFetch).toHaveBeenCalledWith(
      expect.stringContaining('/transactions'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );
    expect(result).toEqual({ success: true, hash: 'fakehash' });

    if (originalFetch !== undefined) {
      (global as any).fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
  });

  it('returns a submit failure when horizon rejects the transaction', async () => {
    const originalFetch = (global as any).fetch;
    const fakeFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ extras: { result_codes: { transaction: 'tx_bad_auth' } } }),
      statusText: 'Bad Request',
    });
    (global as any).fetch = fakeFetch;

    const result = await submitTransaction('signed-xdr');

    expect(result).toEqual({
      success: false,
      status: 'submitFailed',
      code: 'tx_bad_auth',
      error: 'tx_bad_auth',
    });
    expect(fakeFetch).toHaveBeenCalledTimes(1);

    if (originalFetch !== undefined) {
      (global as any).fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
  });

  it('polls until a transaction becomes available', async () => {
    jest.useFakeTimers();
    const originalFetch = (global as any).fetch;

    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => null })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'fakehash' }) });
    (global as any).fetch = fetchMock;

    const promise = pollForConfirmation('fakehash', { intervalMs: 10, timeoutMs: 1000 });

    await jest.advanceTimersByTimeAsync(10);
    await Promise.resolve();

    const result = await promise;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true, hash: 'fakehash' });

    if (originalFetch !== undefined) {
      (global as any).fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
    jest.useRealTimers();
  });

  it('returns a confirmation timeout when horizon does not see the transaction', async () => {
    jest.useFakeTimers();
    const originalFetch = (global as any).fetch;

    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => null,
    });
    (global as any).fetch = fetchMock;

    const promise = pollForConfirmation('fakehash', { intervalMs: 10, timeoutMs: 50 });
    await jest.advanceTimersByTimeAsync(50);
    await Promise.resolve();

    const result = await promise;

    expect(result).toEqual({
      success: false,
      status: 'confirmationTimeout',
      error: 'Transaction did not confirm within 0.05 seconds',
    });
    expect(fetchMock).toHaveBeenCalled();

    if (originalFetch !== undefined) {
      (global as any).fetch = originalFetch;
    } else {
      delete (global as any).fetch;
    }
    jest.useRealTimers();
  });
});
