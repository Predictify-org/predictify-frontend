import type { Meta, StoryObj } from "@storybook/react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownCheckboxItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownGroup,
} from "./Dropdown";
import { Button } from "@/components/ui/button";
import { ChevronDown, SlidersHorizontal, Trash2, User, Settings } from "lucide-react";
import { useState } from "react";

const meta: Meta = {
  title: "Components/Dropdown",
  component: Dropdown,
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="outline">
          Options <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownTrigger>
      <DropdownContent className="w-56">
        <DropdownLabel>Market Actions</DropdownLabel>
        <DropdownSeparator />
        <DropdownGroup>
          <DropdownItem>
            <User className="mr-2 h-4 w-4" /> View Creator Profile
          </DropdownItem>
          <DropdownItem>
            <Settings className="mr-2 h-4 w-4" /> Notification Settings
          </DropdownItem>
        </DropdownGroup>
        <DropdownSeparator />
        <DropdownItem className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete Draft
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  ),
};

export const WithCheckboxesAndDisabled: StoryObj = {
  render: function CheckboxDemo() {
    const [showResolved, setShowResolved] = useState(true);
    const [showDisputed, setShowDisputed] = useState(false);

    return (
      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="secondary">
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Filter Views
          </Button>
        </DropdownTrigger>
        <DropdownContent className="w-56">
          <DropdownLabel>Display Filters</DropdownLabel>
          <DropdownSeparator />
          <DropdownCheckboxItem checked={showResolved} onCheckedChange={setShowResolved}>
            Show Resolved Markets
          </DropdownCheckboxItem>
          <DropdownCheckboxItem checked={showDisputed} onCheckedChange={setShowDisputed}>
            Show Disputed Markets
          </DropdownCheckboxItem>
          <DropdownCheckboxItem disabled checked={false}>
            Show Private Pools (Locked)
          </DropdownCheckboxItem>
        </DropdownContent>
      </Dropdown>
    );
  },
};

export const LongContent: StoryObj = {
  render: () => (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="outline">Select Oracle Provider</Button>
      </DropdownTrigger>
      <DropdownContent className="w-80">
        <DropdownLabel>Registered Soroban Oracles</DropdownLabel>
        <DropdownSeparator />
        <DropdownItem>
          Reflector Decentralized Pricing Feed (Primary Stellar Anchor)
        </DropdownItem>
        <DropdownItem>
          Pyth Network Real-Time Cryptographic Low-Latency Price Stream
        </DropdownItem>
        <DropdownItem disabled>
          Band Protocol High-Throughput Cross-Chain Oracle (Temporarily Inactive)
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  ),
};
