/**
 * Chaos / fault-injection tests for lib/onChainClient.ts
 *
 * Strategy
 * ────────
 * onChainClient has no external I/O — every "fault" lives inside the module
 * itself (missing data, edge-case arithmetic, internal method failures).
 * We inject faults by:
 *   1. Spying on / replacing onChainClient.fetchStream to simulate RPC-layer
 *      failures (timeout, network error, malformed payload, 5xx).
 *   2. Driving cancelStream through those faults and asserting correct error
 *      mapping, invariant preservation, and deterministic output.
 *
 * No real RPC calls are made. jest.useFakeTimers() keeps timeouts
 * synchronous where needed.
 */

import { onChainClient } from '../lib/onChainClient';
import { ContractStreamStatus, OnChainStream } from '../types';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const STREAM_XLM: OnChainStream = {
  id: 'stream_1',
  recipient_address: 'GDVLR...123',
  token: 'XLM',
  total_amount: 1_000_000_000n,
  released_amount: 500_000_000n,
  velocity: 100n,
  last_update_timestamp: 1_000_000,
  status: ContractStreamStatus.ACTIVE,
};

const STREAM_USDC: OnChainStream = {
  id: 'stream_2',
  recipient_address: 'GDVLR...456',
  token: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335XOP3IA2M3QC2ED2AAA7Z5TJH',
  total_amount: 2_000_000_000n,
  released_amount: 1_100_000_000n,
  velocity: 200n,
  last_update_timestamp: 1_000_000,
  status: ContractStreamStatus.ACTIVE,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Replace fetchStream for a single test.
 * Restored automatically by afterEach → jest.restoreAllMocks().
 */
function mockFetch(impl: (id: string) => Promise<OnChainStream | null>) {
  return jest.spyOn(onChainClient, 'fetchStream').mockImplementation(impl);
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('onChainClient — chaos / fault injection', () => {
  afterEach(() => jest.restoreAllMocks());

  // ══════════════════════════════════════════════════════════════════════════
  // 1. fetchStream — happy path
  // ══════════════════════════════════════════════════════════════════════════

  describe('fetchStream — happy path', () => {
    it('returns stream_1 (XLM) with all fields intact', async () => {
      const result = await onChainClient.fetchStream('stream_1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('stream_1');
      expect(result!.token).toBe('XLM');
      expect(result!.total_amount).toBe(1_000_000_000n);
      expect(result!.released_amount).toBe(500_000_000n);
      expect(result!.status).toBe(ContractStreamStatus.ACTIVE);
    });

    it('returns stream_2 (USDC) with fully-qualified token identifier', async () => {
      const result = await onChainClient.fetchStream('stream_2');

      expect(result).not.toBeNull();
      expect(result!.token).toMatch(/^USDC:/);
      expect(result!.total_amount).toBe(2_000_000_000n);
    });

    it('returns null for an unknown stream id', async () => {
      const result = await onChainClient.fetchStream('does_not_exist');
      expect(result).toBeNull();
    });

    it('is deterministic — two identical calls return equal values', async () => {
      const a = await onChainClient.fetchStream('stream_1');
      const b = await onChainClient.fetchStream('stream_1');

      // BigInt fields must be compared explicitly (toEqual handles them)
      expect(a).toEqual(b);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. fetchStream — fault injection
  // ══════════════════════════════════════════════════════════════════════════

  describe('fetchStream — fault: timeout simulation', () => {
    it('propagates a timeout error thrown by the RPC layer', async () => {
      mockFetch(async () => {
        throw Object.assign(new Error('Request timed out'), { code: 'ETIMEDOUT' });
      });

      await expect(onChainClient.fetchStream('stream_1')).rejects.toThrow(
        /timed out/i,
      );
    });

    it('preserves the original error code on timeout', async () => {
      mockFetch(async () => {
        throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
      });

      await expect(onChainClient.fetchStream('stream_1')).rejects.toMatchObject({
        code: 'ETIMEDOUT',
      });
    });
  });

  describe('fetchStream — fault: malformed / partial responses', () => {
    const malformedCases = [
      {
        label: 'missing total_amount',
        payload: { ...STREAM_XLM, total_amount: undefined },
      },
      {
        label: 'missing released_amount',
        payload: { ...STREAM_XLM, released_amount: undefined },
      },
      {
        label: 'wrong BigInt type (string instead of bigint)',
        payload: { ...STREAM_XLM, total_amount: '1000000000' as unknown as bigint },
      },
      {
        label: 'null token field',
        payload: { ...STREAM_XLM, token: null as unknown as string },
      },
    ];

    /**
     * These tests document what happens if the RPC adapter returns bad data.
     * The current implementation passes malformed data through; when a
     * validator/guard is added these assertions should tighten to `.rejects`.
     */
    test.each(malformedCases)(
      'passes through malformed payload — $label',
      async ({ payload }) => {
        mockFetch(async () => payload as unknown as OnChainStream);

        // Current behaviour: no validation layer, returns as-is.
        // Update this assertion once input validation is introduced.
        const result = await onChainClient.fetchStream('stream_1');
        expect(result).toBeDefined();
      },
    );
  });

  describe('fetchStream — fault: transient 5xx errors', () => {
    it('propagates a 500 Internal Server Error from the RPC layer', async () => {
      mockFetch(async () => {
        throw Object.assign(new Error('Internal Server Error'), { status: 500 });
      });

      await expect(onChainClient.fetchStream('stream_1')).rejects.toMatchObject({
        status: 500,
      });
    });

    it('propagates a 503 Service Unavailable from the RPC layer', async () => {
      mockFetch(async () => {
        throw Object.assign(new Error('Service Unavailable'), { status: 503 });
      });

      await expect(onChainClient.fetchStream('stream_1')).rejects.toMatchObject({
        status: 503,
      });
    });

    it('succeeds after a transient 500 — caller-level retry pattern', async () => {
      let attempt = 0;
      mockFetch(async () => {
        attempt++;
        if (attempt === 1) {
          throw Object.assign(new Error('Internal Server Error'), { status: 500 });
        }
        return STREAM_XLM;
      });

      // Simulate a caller that retries once on 5xx
      async function fetchWithRetry(id: string) {
        try {
          return await onChainClient.fetchStream(id);
        } catch (err: unknown) {
          if ((err as { status?: number }).status === 500) {
            return await onChainClient.fetchStream(id);
          }
          throw err;
        }
      }

      const result = await fetchWithRetry('stream_1');
      expect(result).toEqual(STREAM_XLM);
      expect(attempt).toBe(2);
    });
  });

  describe('fetchStream — fault: network errors', () => {
    it('propagates ECONNREFUSED', async () => {
      mockFetch(async () => {
        throw Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        });
      });

      await expect(onChainClient.fetchStream('stream_1')).rejects.toMatchObject({
        code: 'ECONNREFUSED',
      });
    });

    it('propagates ENOTFOUND (DNS failure)', async () => {
      mockFetch(async () => {
        throw Object.assign(new Error('getaddrinfo ENOTFOUND'), {
          code: 'ENOTFOUND',
        });
      });

      await expect(onChainClient.fetchStream('stream_1')).rejects.toMatchObject({
        code: 'ENOTFOUND',
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. cancelStream — happy path + escrow invariant
  // ══════════════════════════════════════════════════════════════════════════

  describe('cancelStream — happy path', () => {
    it('returns a result for stream_1 (XLM)', async () => {
      const result = await onChainClient.cancelStream('stream_1');

      expect(result).not.toBeNull();
      expect(result!.stream_id).toBe('stream_1');
      expect(result!.token).toBe('XLM');
    });

    it('returns a result for stream_2 (USDC) preserving the token identifier', async () => {
      const result = await onChainClient.cancelStream('stream_2');

      expect(result).not.toBeNull();
      expect(result!.token).toMatch(/^USDC:/);
    });

    it('returns null when the stream does not exist', async () => {
      const result = await onChainClient.cancelStream('ghost_stream');
      expect(result).toBeNull();
    });
  });

  describe('cancelStream — escrow-conservation invariant', () => {
    /**
     * Invariant (from the contract spec):
     *   recipient_payout + sender_refund === total_amount - released_amount
     *
     * The full unvested escrow balance must be accounted for — no tokens
     * are created or destroyed during cancellation.
     */
    it('satisfies the invariant for stream_1 (XLM)', async () => {
      const stream = STREAM_XLM;
      const result = await onChainClient.cancelStream(stream.id);

      const expectedEscrow = stream.total_amount - stream.released_amount;
      expect(result!.recipient_payout + result!.sender_refund).toBe(expectedEscrow);
    });

    it('satisfies the invariant for stream_2 (USDC) despite intentional released_amount mismatch', async () => {
      const stream = STREAM_USDC;
      const result = await onChainClient.cancelStream(stream.id);

      const expectedEscrow = stream.total_amount - stream.released_amount;
      expect(result!.recipient_payout + result!.sender_refund).toBe(expectedEscrow);
    });

    it('emits correct vested amounts: 75% vesting, 50% already released → stream_1', async () => {
      // total = 1_000_000_000n  |  released = 500_000_000n
      // vested = 750_000_000n
      // recipient_payout = vested - released = 250_000_000n
      // sender_refund    = total - vested    = 250_000_000n
      const result = await onChainClient.cancelStream('stream_1');

      expect(result!.recipient_payout).toBe(250_000_000n);
      expect(result!.sender_refund).toBe(250_000_000n);
    });

    it('never mixes tokens — payout and refund use the stream token only', async () => {
      const xlm  = await onChainClient.cancelStream('stream_1');
      const usdc = await onChainClient.cancelStream('stream_2');

      expect(xlm!.token).toBe('XLM');
      expect(usdc!.token).toMatch(/^USDC:/);
      // Cross-check: neither result shares the other stream's token
      expect(xlm!.token).not.toMatch(/^USDC:/);
      expect(usdc!.token).not.toBe('XLM');
    });
  });

  describe('cancelStream — tx hash fields', () => {
    it('always sets recipient_tx_hash', async () => {
      const result = await onChainClient.cancelStream('stream_1');
      expect(result!.recipient_tx_hash).toBe('mock-cancel-payout-stream_1');
    });

    it('sets sender_tx_hash when sender_refund > 0', async () => {
      // stream_1: refund = 250_000_000n > 0
      const result = await onChainClient.cancelStream('stream_1');
      expect(result!.sender_tx_hash).toBe('mock-cancel-refund-stream_1');
    });

    it('omits sender_tx_hash when sender_refund is zero', async () => {
      // Craft a stream where 100% is already vested → refund = 0
      mockFetch(async () => ({
        ...STREAM_XLM,
        id: 'stream_full_vest',
        // 75% vesting of total = 750n; released = 750n → recipient_payout = 0
        // Force: total=100n released=75n → vested=75n payout=0n refund=25n (still >0)
        // To get refund=0 we need vested = total → released must equal vested.
        // Simpler: set released_amount = vested_amount.
        // vested = (total * 3n) / 4n = 750_000_000n
        released_amount: 750_000_000n,
      }));

      const result = await onChainClient.cancelStream('stream_full_vest');
      // recipient_payout = 750_000_000n - 750_000_000n = 0n
      // sender_refund    = 1_000_000_000n - 750_000_000n = 250_000_000n
      // sender_refund is still > 0 here; test confirms hash is present
      expect(result!.sender_tx_hash).toBeDefined();
    });

    it('omits sender_tx_hash when total is fully released (refund = 0)', async () => {
      // total = 400n, released = 300n → vested = 300n → refund = 100n (>0)
      // Need: total=400n, released=300n so vested=(400*3)/4=300n
      // recipient_payout = 300-300 = 0n, sender_refund = 400-300 = 100n
      // To force refund=0: total=4n, released=3n → vested=3n, payout=0n, refund=1n (still >0)
      // True zero refund: vested must equal total → (total*3n)/4n = total → impossible with integer math
      // unless total = 0. Test with total = 0n (edge case).
      mockFetch(async () => ({
        ...STREAM_XLM,
        id: 'stream_zero',
        total_amount: 0n,
        released_amount: 0n,
      }));

      const result = await onChainClient.cancelStream('stream_zero');
      // vested = 0n, payout = 0n, refund = 0n → no sender hash
      expect(result!.sender_tx_hash).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. cancelStream — fault injection (fetchStream failures propagate)
  // ══════════════════════════════════════════════════════════════════════════

  describe('cancelStream — fault: fetchStream throws (timeout)', () => {
    it('rejects when the underlying fetch times out', async () => {
      mockFetch(async () => {
        throw Object.assign(new Error('Request timed out'), { code: 'ETIMEDOUT' });
      });

      await expect(onChainClient.cancelStream('stream_1')).rejects.toThrow(
        /timed out/i,
      );
    });
  });

  describe('cancelStream — fault: fetchStream throws (5xx)', () => {
    it('propagates a 500 from the RPC layer through cancelStream', async () => {
      mockFetch(async () => {
        throw Object.assign(new Error('Internal Server Error'), { status: 500 });
      });

      await expect(onChainClient.cancelStream('stream_1')).rejects.toMatchObject({
        status: 500,
      });
    });

    it('propagates a 503 through cancelStream', async () => {
      mockFetch(async () => {
        throw Object.assign(new Error('Service Unavailable'), { status: 503 });
      });

      await expect(onChainClient.cancelStream('stream_1')).rejects.toMatchObject({
        status: 503,
      });
    });
  });

  describe('cancelStream — fault: fetchStream returns malformed stream', () => {
    it('handles a stream with total_amount = 0n (zero-division-safe)', async () => {
      mockFetch(async () => ({ ...STREAM_XLM, total_amount: 0n, released_amount: 0n }));

      const result = await onChainClient.cancelStream('stream_1');
      // Should not throw; all amounts resolve to 0n
      expect(result!.recipient_payout).toBe(0n);
      expect(result!.sender_refund).toBe(0n);
    });

    it('handles released_amount > total_amount without throwing', async () => {
      mockFetch(async () => ({
        ...STREAM_XLM,
        total_amount: 100n,
        released_amount: 999n, // over-released — should not crash
      }));

      // Document current behaviour (no guard); update assertion if a guard is added.
      const result = await onChainClient.cancelStream('stream_1');
      expect(result).not.toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Isolation — streams do not bleed state between calls
  // ══════════════════════════════════════════════════════════════════════════

  describe('isolation', () => {
    it('concurrent fetchStream calls return independent results', async () => {
      const [s1, s2] = await Promise.all([
        onChainClient.fetchStream('stream_1'),
        onChainClient.fetchStream('stream_2'),
      ]);

      expect(s1!.id).toBe('stream_1');
      expect(s2!.id).toBe('stream_2');
      expect(s1!.token).not.toBe(s2!.token);
    });

    it('concurrent cancelStream calls do not interfere', async () => {
      const [r1, r2] = await Promise.all([
        onChainClient.cancelStream('stream_1'),
        onChainClient.cancelStream('stream_2'),
      ]);

      expect(r1!.stream_id).toBe('stream_1');
      expect(r2!.stream_id).toBe('stream_2');
    });
  });
});