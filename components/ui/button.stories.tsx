import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { Plus, ArrowRight, Loader2 } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Predict Outcome",
    variant: "default",
    size: "default",
  },
};

export const Secondary: Story = {
  args: {
    children: "View Details",
    variant: "secondary",
  },
};

export const Outline: Story = {
  args: {
    children: "Cancel Order",
    variant: "outline",
  },
};

export const Destructive: Story = {
  args: {
    children: "Liquidate Position",
    variant: "destructive",
  },
};

export const Disabled: Story = {
  args: {
    children: "Insufficient Balance",
    disabled: true,
    variant: "default",
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="default">
        <Plus className="h-4 w-4" /> Create Market
      </Button>
      <Button variant="outline">
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
      <Button disabled variant="secondary">
        <Loader2 className="h-4 w-4 animate-spin" /> Processing...
      </Button>
    </div>
  ),
};

export const LongContent: Story = {
  args: {
    children:
      "Confirm stake of 500,000.00 XLM into decentralized multi-collateral oracle prediction market with automated liquidity pool routing",
    variant: "default",
    className: "max-w-md",
  },
};
