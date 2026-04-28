import { transition } from "./state-machine";
import { StreamStatus, StreamAction } from "@/app/types/openapi";
import * as fc from "fast-check";

describe("Stream State Machine", () => {
  describe("Legal Transitions", () => {
    const cases: [StreamStatus, StreamAction, StreamStatus][] = [
      ["draft", "start", "active"],
      ["draft", "stop", "ended"],
      ["active", "pause", "paused"],
      ["active", "stop", "ended"],
      ["active", "settle", "ended"],
      ["paused", "start", "active"],
      ["paused", "stop", "ended"],
      ["ended", "withdraw", "withdrawn"],
    ];

    test.each(cases)("from %s, action %s should lead to %s", (current, action, expected) => {
      const result = transition(current, action);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.nextStatus).toBe(expected);
      }
    });
  });

  describe("Idempotent Actions", () => {
    const cases: [StreamStatus, StreamAction][] = [
      ["active", "start"],
      ["paused", "pause"],
      ["ended", "stop"],
      ["ended", "settle"],
      ["withdrawn", "withdraw"],
    ];

    test.each(cases)("from %s, action %s should be idempotent", (current, action) => {
      const result = transition(current, action);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.nextStatus).toBe(current);
      }
    });
  });

  describe("Illegal Transitions", () => {
    const cases: [StreamStatus, StreamAction][] = [
      ["draft", "pause"],
      ["draft", "settle"],
      ["draft", "withdraw"],
      ["ended", "start"],
      ["ended", "pause"],
      ["withdrawn", "stop"],
    ];

    test.each(cases)("from %s, action %s should be illegal", (current, action) => {
      const result = transition(current, action);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("ILLEGAL_TRANSITION");
      }
    });
  });

  describe("Property-based testing", () => {
    it("should never allow a transition to 'active' from 'ended'", () => {
      fc.assert(
        fc.property(
          fc.constantFrom<StreamStatus>("ended", "withdrawn"),
          fc.constantFrom<StreamAction>("start", "pause", "stop", "settle"),
          (status, action) => {
            const result = transition(status, action);
            if (result.ok) {
              return result.nextStatus !== "active";
            }
            return true;
          }
        )
      );
    });

    it("should reach 'withdrawn' only if it was previously 'ended'", () => {
      // This is a bit complex for a stateless transition function, 
      // but we can verify that only 'ended' -> 'withdraw' leads to 'withdrawn'.
      fc.assert(
        fc.property(
          fc.constantFrom<StreamStatus>("draft", "active", "paused", "ended", "withdrawn"),
          fc.constantFrom<StreamAction>("start", "pause", "stop", "settle", "withdraw"),
          (status, action) => {
            const result = transition(status, action);
            if (result.ok && result.nextStatus === "withdrawn") {
              return status === "ended" || status === "withdrawn";
            }
            return true;
          }
        )
      );
    });
  });
});
