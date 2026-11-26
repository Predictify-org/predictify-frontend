import type { Meta, StoryObj } from "@storybook/react";
import { Tabs } from "./Tabs";
import { Activity, BarChart3, Clock, AlertCircle } from "lucide-react";

const meta: Meta<typeof Tabs> = {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  args: {
    tabs: [
      {
        value: "overview",
        label: "Overview",
        content: (
          <div className="p-4 rounded-md border border-border bg-card text-card-foreground">
            <h4 className="font-semibold text-sm">Market Overview</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Live odds, total pool volume, and liquidity depth.
            </p>
          </div>
        ),
      },
      {
        value: "activity",
        label: "Activity Feed",
        content: (
          <div className="p-4 rounded-md border border-border bg-card text-card-foreground">
            <h4 className="font-semibold text-sm">On-chain Transactions</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Chronological log of bets, payouts, and resolutions.
            </p>
          </div>
        ),
      },
      {
        value: "analytics",
        label: "Analytics",
        content: (
          <div className="p-4 rounded-md border border-border bg-card text-card-foreground">
            <h4 className="font-semibold text-sm">Odds History Chart</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Historical movement across 1H, 24H, 7D, and ALL ranges.
            </p>
          </div>
        ),
      },
    ],
    defaultValue: "overview",
  },
};

export const WithDisabledTab: Story = {
  args: {
    tabs: [
      {
        value: "active-orders",
        label: "Active Orders",
        content: <p className="text-sm p-3">3 open prediction positions.</p>,
      },
      {
        value: "settlement",
        label: "Settlement Audit",
        disabled: true,
        content: <p className="text-sm p-3">Available once market reaches resolution date.</p>,
      },
      {
        value: "disputes",
        label: "Disputes (0)",
        content: <p className="text-sm p-3">No active disputes registered.</p>,
      },
    ],
    defaultValue: "active-orders",
  },
};

export const LongContent: Story = {
  args: {
    tabs: [
      {
        value: "stellar-core",
        label: "Stellar Consensus Protocol Layer & Soroban WASM Smart Contracts Execution Details",
        content: (
          <div className="p-4 rounded-md border bg-muted/20 text-sm space-y-2">
            <p>
              Detailed breakdown of cryptographic quorum slices, ledger sequence commitments, and transaction footprints across validator nodes.
            </p>
          </div>
        ),
      },
      {
        value: "liquidity-providers",
        label: "Automated Constant Product Market Maker (CPMM) Pool Metrics & Reserve Ratios",
        content: (
          <div className="p-4 rounded-md border bg-muted/20 text-sm space-y-2">
            <p>
              Mathematical invariance k = x * y maintained across all YES/NO token swaps with dynamic swap fee distribution.
            </p>
          </div>
        ),
      },
    ],
    defaultValue: "stellar-core",
  },
};
