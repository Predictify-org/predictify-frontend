import * as fc from 'fast-check';
import { 
  checkConservationOfValue, 
  checkNonNegativeBalances, 
  applyStreamEvent, 
  StreamState 
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
});
