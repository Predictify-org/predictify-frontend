import type { MechanicHelpContent } from "@/components/patterns/MechanicHelp";

export const platformFeesHelp: MechanicHelpContent = {
  title: "Platform fees",
  tooltip: "A small share of the settled pool is retained before winnings are distributed.",
  summary:
    "Fees are applied after market resolution so entrants see the gross pool while trading and the net payout when the outcome is final.",
  learnMoreLabel: "Learn more",
  sections: [
    {
      title: "When fees apply",
      body: "Predictify deducts fees once the market settles, not while the market is still open or waiting on an oracle update.",
    },
    {
      title: "What users should expect",
      body: "Winners receive a net payout after fees. Keeping the detail behind an optional layer avoids cluttering the primary bet flow.",
      bullets: [
        "Visible pool totals stay easy to scan during market activity.",
        "Net payout details remain available before a user commits.",
      ],
    },
  ],
  note: "Surface this pattern near payout, fee, and settlement language so users always have the same entry point.",
};

export const disputesHelp: MechanicHelpContent = {
  title: "How disputes work",
  tooltip: "Disputes let the community challenge a resolution when the recorded outcome looks wrong.",
  summary:
    "The first layer explains the purpose in one sentence. The deeper layer covers staking, evidence, and the outcome timeline for power users.",
  learnMoreLabel: "Learn more",
  sections: [
    {
      title: "When a dispute is appropriate",
      body: "Users should only open a dispute when public evidence, oracle data, or official results conflict with the resolved outcome.",
    },
    {
      title: "What happens next",
      body: "A dispute opens a time-bound review flow that can move through staking, community voting, and final execution.",
      bullets: [
        "Opening a dispute may require a stake or fee.",
        "Evidence should be public and easy for others to verify.",
        "Losing sides can face penalties once the final result is executed.",
      ],
    },
  ],
  note: "Keep the default UI calm. Only reveal process detail when a user explicitly asks for it.",
};

export const oracleDelayHelp: MechanicHelpContent = {
  title: "Oracle delays and timeouts",
  tooltip: "Markets can stay in a resolving state after closing while the oracle confirms the final outcome.",
  summary:
    "This pattern helps first-time users understand why a market did not settle instantly without forcing everyone to read the full resolution policy.",
  learnMoreLabel: "Learn more",
  sections: [
    {
      title: "Why a market may stay open after the deadline",
      body: "The betting window can close before the result is final. Predictify may wait for one or more trusted oracle updates before releasing payouts.",
    },
    {
      title: "What a timeout means",
      body: "A timeout does not always signal an error. It often means the oracle window is still active or the market has entered a manual review path.",
      bullets: [
        "Closed: no new entries are accepted.",
        "Resolving: the system is waiting for confirmation.",
        "Disputed: a challenge or evidence review is in progress.",
      ],
    },
  ],
  note: "Pair this explanation with countdowns and status badges so users can connect the message to what they see on the market card.",
};
