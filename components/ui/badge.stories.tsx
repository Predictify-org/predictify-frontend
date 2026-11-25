import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "destructive", "outline", "info", "success", "warning", "danger", "neutral"],
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Active Market",
    variant: "default",
    size: "md",
  },
};

export const Success: Story = {
  args: {
    children: (
      <>
        <CheckCircle2 className="h-3 w-3" /> Resolved YES
      </>
    ),
    variant: "success",
    size: "md",
  },
};

export const Warning: Story = {
  args: {
    children: (
      <>
        <AlertTriangle className="h-3 w-3" /> Under Dispute
      </>
    ),
    variant: "warning",
    size: "md",
  },
};

export const DangerError: Story = {
  args: {
    children: (
      <>
        <XCircle className="h-3 w-3" /> Cancelled / Invalid
      </>
    ),
    variant: "danger",
    size: "md",
  },
};

export const DisabledNeutral: Story = {
  args: {
    children: "Archived",
    variant: "neutral",
    size: "sm",
  },
};

export const AllTaxonomyVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const LongContent: Story = {
  args: {
    children: "Categorized under Decentralized Finance & Cross-Chain Automated Liquidity Prediction Markets",
    variant: "info",
    size: "md",
    className: "max-w-xs truncate",
  },
};
