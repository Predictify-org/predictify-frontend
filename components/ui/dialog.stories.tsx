import type { Meta, StoryObj } from "@storybook/react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./dialog";
import { Button } from "./button";
import { AlertCircle } from "lucide-react";

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  component: Dialog,
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">Open Market Details</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Market Resolution Rules</DialogTitle>
          <DialogDescription>
            This market resolves according to the official Stellar Consensus Protocol state.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-muted-foreground">
          Outcomes will be confirmed by decentralized oracles once the event window terminates.
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <Button variant="default">I Understand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const ErrorConfirmation: StoryObj = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent className="border-destructive/50">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Cancel All Orders?</DialogTitle>
          </div>
          <DialogDescription>
            This action cannot be undone. All active liquidity orders will be cancelled immediately and fees may apply.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
          Warning: network gas fees for batch cancellation cannot be refunded.
        </div>
        <DialogFooter>
          <Button variant="outline">Abort</Button>
          <Button variant="destructive">Confirm Cancellation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const LongContent: StoryObj = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">View Full Terms and Disclosures</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Comprehensive Protocol Terms & Conditions</DialogTitle>
          <DialogDescription>
            Please read these terms carefully before placing predictions on the decentralized network.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Section 1. Protocol Architecture: Predictify is a decentralized autonomous market interface interacting with smart contracts deployed on the Stellar blockchain network.
          </p>
          <p>
            Section 2. Oracle Resolution: Disputed results fall into the multi-tiered resolution mechanism outlined in protocol governance documentation.
          </p>
          <p>
            Section 3. Liquidity & Slashing: Malicious dispute reporting or validator collusions will incur automated collateral slashing pursuant to Soroban contract specifications.
          </p>
          <p>
            Section 4. Finality: All outcomes settled on-chain represent final protocol consensus and are immutable.
          </p>
        </div>
        <DialogFooter>
          <Button variant="default">Acknowledge Terms</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
