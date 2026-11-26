import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "floating"],
    },
    disabled: {
      control: "boolean",
    },
    success: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: "Enter stake amount in XLM...",
    variant: "default",
  },
};

export const FloatingLabel: Story = {
  args: {
    label: "Wallet Address",
    variant: "floating",
    placeholder: "e.g. GABC...",
  },
};

export const WithSuccess: Story = {
  args: {
    label: "Recipient Account",
    variant: "floating",
    defaultValue: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVAAA",
    success: true,
  },
};

export const WithError: Story = {
  args: {
    label: "Prediction Stake",
    variant: "floating",
    defaultValue: "-150",
    error: "Amount must be a positive number greater than zero",
  },
};

export const Disabled: Story = {
  args: {
    label: "Oracle Public Key",
    variant: "floating",
    defaultValue: "GCLDT4L6T7L3J36J2E7PQXQJZX7K3N32PQRV8L6W",
    disabled: true,
    helpText: "Oracle keys are set at contract creation and cannot be edited.",
  },
};

export const LongContent: Story = {
  args: {
    label: "Detailed Market Resolution Source Specification",
    variant: "floating",
    defaultValue:
      "https://stellar.expert/explorer/public/contract/CA3D5KRYMCMCZWPTFCGQ45KZRB5W3CQ754TG42QW5L5KPDWLMK56B42J?event=market_finalized_audit_stream_v2",
    className: "w-full",
  },
};
