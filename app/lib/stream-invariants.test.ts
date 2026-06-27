import * as fc from 'fast-check';
import { 
  checkConservationOfValue, 
  checkNonNegativeBalances, 
  applyStreamEvent, 
  StreamState,
  checkVestedBound,
  calculateVestedAmount
} from './stream-invariants';

describe('Stream Invariants (Property-based)', () => {
  const isHeavyMode = process.env.TEST_MODE === 'heavy';
  const numRuns = isHeavyMode ? 10000 : 1000;

  it(`should maintain conservation of value (${numRuns} runs)`, () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom('deposit', 'withdraw', 'refund'),
            amount: fc.float({ min: 0, max: 10000, noNaN: true })
          }),
          { maxLength: 50 }
        ),
        (events) => {
          let state: StreamState = { deposited: 0, withdrawn: 0, escrow: 0 };
          
          for (const event of events) {
            // Guard against negative escrow in this model to simulate "valid" attempts,
            // or just apply and check the invariant if we want to find failing paths.
            // Requirement says "randomize a sequence of valid mutating events".
            if (event.type === 'withdraw' && event.amount > state.escrow) continue;
            if (event.type === 'refund' && event.amount > state.escrow) continue;
            
            state = applyStreamEvent(state, event);
            
            // Assert invariants
            if (!checkConservationOfValue(state)) return false;
            if (!checkNonNegativeBalances(state)) return false;
          }
          return true;
        }
      ),
      { numRuns, seed: 42 } // Seed for deterministic CI stability
    );
  });

  it('regression: should not allow negative escrow via excessive withdrawal', () => {
    // This is a static test derived from what a property test might find
    const state: StreamState = { deposited: 100, withdrawn: 0, escrow: 100 };
    const invalidEvent = { type: 'withdraw' as const, amount: 150 };
    const newState = applyStreamEvent(state, invalidEvent);
    
    expect(checkNonNegativeBalances(newState)).toBe(false);
    expect(newState.escrow).toBe(-50);
  });

  it(`should maintain vested amount between 0 and totalAmount (principal) across all times (${numRuns} runs)`, () => {
    fc.assert(
      fc.property(
        fc.record({
          totalAmount: fc.float({ min: 1, max: 10000, noNaN: true }),
          startTime: fc.integer({ min: 0, max: 1e12 }),
          duration: fc.integer({ min: 1, max: 1e10 }),
          now: fc.integer({ min: 0, max: 1e12 }),
          pausedRanges: fc.array(
            fc.tuple(
              fc.integer({ min: 0, max: 1e12 }),
              fc.integer({ min: 0, max: 1e12 })
            ),
            { maxLength: 10
          )
        }),
        ({ totalAmount, startTime, duration, now, pausedRanges }) => {
          const endTime = startTime + duration;
          // Normalize paused ranges so that each pausedAt <= resumedAt
          const normalizedPausedRanges = pausedRanges.map(([a, b]) => [
            Math.min(a, b), Math.max(a, b) ]);
          
          const vested = calculateVestedAmount(
            totalAmount, startTime, endTime, now, normalizedPausedRanges);
          
          return checkVestedBound({ vestedAmount: vested, totalAmount });
        }
      ),
      { numRuns, seed: 43 }
    );
  });

  it(`should have non-decreasing vested amount as time increases (${numRuns} runs)`, () => {
    fc.assert(
      fc.property(
        fc.record({
          totalAmount: fc.float({ min: 1, max: 10000, noNaN: true }),
          startTime: fc.integer({ min: 0, max: 1e12 }),
          duration: fc.integer({ min: 1, max: 1e10 }),
          now1: fc.integer({ min: 0, max: 1e12 }),
          now2: fc.integer({ min: 0, max: 1e12 }),
          pausedRanges: fc.array(
            fc.tuple(
              fc.integer({ min: 0, max: 1e12 }),
              fc.integer({ min: 0, max: 1e12 })
            ),
            { maxLength: 10
          )
        }),
        ({ totalAmount, startTime, duration, now1, now2, pausedRanges }) => {
          const endTime = startTime + duration;
          const normalizedPausedRanges = pausedRanges.map(([a, b]) => [
            Math.min(a, b), Math.max(a, b) ]);
          
          const t1 = Math.min(now1, now2);
          const t2 = Math.max(now1, now2);
          
          const vested1 = calculateVestedAmount(totalAmount, startTime, endTime, t1, normalizedPausedRanges);
          const vested2 = calculateVestedAmount(totalAmount, startTime, endTime, t2, normalizedPausedRanges);
          
          return vested1 <= vested2;
        }
      ),
      { numRuns, seed: 44 }
    );
  });

  it('regression: vested amount should be 0 before start time', () => {
    const totalAmount = 1000;
    const startTime = 1000;
    const endTime = 2000;
    const now = 500;
    const vested = calculateVestedAmount(totalAmount, startTime, endTime, now);
    expect(vested).toBe(0);
    expect(checkVestedBound({ vestedAmount: vested, totalAmount })).toBe(true);
  });

  it('regression: vested amount should be totalAmount after end time', () => {
    const totalAmount = 1000;
    const startTime = 1000;
    const endTime = 2000;
    const now = 3000;
    const vested = calculateVestedAmount(totalAmount, startTime, endTime, now);
    expect(vested).toBe(totalAmount);
    expect(checkVestedBound({ vestedAmount: vested, totalAmount })).toBe(true);
  });
});
