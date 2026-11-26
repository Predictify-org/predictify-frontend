import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "./EmptyState";
import { Inbox, AlertCircle, FileSearch, TrendingUp } from "lucide-react";

const meta: Meta<typeof EmptyState> = {
  title: "Components/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: <Inbox className="h-12 w-12 text-muted-foreground" />,
    title: "No Active Predictions",
    description: "You haven't placed any predictions yet. Explore open markets and stake your XLM.",
    ctaLabel: "Explore Markets",
    ctaHref: "/events",
  },
};

export const NoResultsSearch: Story = {
  args: {
    icon: <FileSearch className="h-12 w-12 text-muted-foreground" />,
    title: "No Markets Found",
    description: "We couldn't find any markets matching your current filter criteria. Try resetting your search query.",
    ctaLabel: "Reset Filters",
    onCTA: () => alert("Filters reset"),
  },
};

export const ErrorEmptyState: Story = {
  args: {
    icon: <AlertCircle className="h-12 w-12 text-destructive" />,
    title: "Failed to Load Predictions",
    description: "Unable to query the Soroban RPC endpoint. Please verify your network connection and retry.",
    ctaLabel: "Retry Connection",
    onCTA: () => alert("Retrying..."),
  },
};

export const DisabledOrReadonly: Story = {
  args: {
    icon: <TrendingUp className="h-12 w-12 text-muted-foreground" />,
    title: "Leaderboard Season Inactive",
    description: "The current prediction tournament has concluded. New rankings will be published next week.",
  },
};

export const LongContent: Story = {
  args: {
    icon: <Inbox className="h-12 w-12 text-muted-foreground" />,
    title: "Decentralized Liquidity Staking Pool Currently Contains Zero Active Liquidity Provider Shares",
    description:
      "All automated market maker reserves for this prediction contract have been temporarily withdrawn by depositors following contract upgrade cycle 4. You may bootstrap initial protocol liquidity by depositing balanced pairs of YES and NO token shares.",
    ctaLabel: "Deposit Initial Bootstrap Liquidity",
    onCTA: () => alert("Deposit clicked"),
  },
};
