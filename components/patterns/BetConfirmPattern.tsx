"use client"

import * as React from "react"
import { Receipt } from "@/components/receipts/Receipt"

import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Kbd } from "@/components/ui/kbd"
import { playSound } from "@/lib/audio/play-sound"
import { LiveRegion } from "@/components/ui/live-region"

/** Each step in the bet placement flow */
type BetStep = "review" | "sign" | "submit" | "confirm"

/** Plain-language announcements for each step transition (WCAG 4.1.3) */
const STEP_MESSAGES: Record<BetStep, string> = {
  review: "Step 1 of 4: Review your prediction details and stake amount.",
  sign:   "Step 2 of 4: Sign the transaction with your wallet.",
  submit: "Step 3 of 4: Submitting your prediction to the network.",
  confirm:"Step 4 of 4: Prediction confirmed. Your stake has been locked in the smart contract.",
}

/** Error messages include a concrete recovery action */
const ERROR_MESSAGES: Record<string, string> = {
  wallet_rejected: "Transaction rejected by wallet. Please try again or check your wallet settings.",
  network_failure: "Network error. Check your connection and select Confirm Prediction to retry.",
}

export function BetConfirmPattern() {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState<BetStep>("review")
  const [error, setError] = React.useState<string | null>(null)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // Ref used to move focus to the active step heading on each transition
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  const isSuccess = step === "confirm"

  /** Advance to a new step, announce it, and move focus to the heading */
  const goToStep = React.useCallback((next: BetStep) => {
    setError(null)
    setStep(next)
    // Focus the heading after React re-renders
    requestAnimationFrame(() => headingRef.current?.focus())
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset to initial state after the close animation finishes
      setTimeout(() => {
        setStep("review")
        setError(null)
      }, 300)
    } else {
      goToStep("review")
    }
  }

  const handleConfirm = () => {
    try {
      goToStep("sign")
      // Simulate async wallet sign → submit → confirm
      setTimeout(() => goToStep("submit"), 600)
      setTimeout(() => {
        goToStep("confirm")
        playSound("confirm")
      }, 1200)
    } catch {
      setError("network_failure")
    }
  }

  /** Narration message: error takes priority over step message */
  const announcement = error
    ? ERROR_MESSAGES[error] ?? "An unexpected error occurred. Please try again."
    : STEP_MESSAGES[step]

  const confirmTitle = isSuccess ? "Prediction Confirmed" : "Confirm Prediction"

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="default" className="bg-[#69daff] text-[#004a5d] hover:bg-[#00cffc]">Place Prediction (Desktop)</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-[#0f1930] text-[#dee5ff] border-[#40485d]">
          {/* Single polite live region for the entire flow */}
          <LiveRegion message={open ? announcement : ""} />

          <DialogHeader>
            {/* tabIndex={-1} allows programmatic focus without adding to tab order */}
            <DialogTitle
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-headline font-bold text-white outline-none"
            >
              {confirmTitle}
            </DialogTitle>
            <DialogDescription className="text-[#a3aac4]">
              Review your position before confirming. Once confirmed, the stake will be locked in the smart contract.
            </DialogDescription>
          </DialogHeader>

          {!isSuccess ? (
            <>
              <BetForm />
              <DialogFooter className="sm:justify-end gap-2 mt-4 flex-row">
                <Button variant="ghost" onClick={() => setOpen(false)} className="text-[#a3aac4] hover:text-white">
                  Cancel
                </Button>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button className="bg-[#69daff] text-[#004a5d] hover:bg-[#00cffc]" onClick={handleConfirm}>
                        Confirm Prediction
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="flex items-center gap-2">
                      <span className="text-xs">Press</span>
                      <Kbd shortcut="confirmBet" actionLabel="to confirm" />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DialogFooter>
            </>
          ) : (
            <Receipt
              receiptId="TXN-98237498234-XYZ"
              amount="$100.00"
              partyA="0x1234...5678 (You)"
              partyB="Predictify Market Pool"
              timestamp={new Date().toISOString()}
              type="Bet Placement"
            />
          )}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button variant="default" className="bg-[#69daff] text-[#004a5d] hover:bg-[#00cffc] w-full">Place Prediction (Mobile)</Button>
      </DrawerTrigger>
      <DrawerContent className={isSuccess ? "bg-background border-border" : "bg-[#0f1930] text-[#dee5ff] border-[#40485d]"}>
        {/* Single polite live region for the entire flow */}
        <LiveRegion message={open ? announcement : ""} />

        {!isSuccess ? (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle
                ref={headingRef}
                tabIndex={-1}
                className="text-xl font-headline font-bold text-white outline-none"
              >
                Confirm Prediction
              </DrawerTitle>
              <DrawerDescription className="text-[#a3aac4]">
                Review your position before confirming. Once confirmed, the stake will be locked in the smart contract.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">
              <BetForm />
            </div>
            <DrawerFooter className="pt-4 flex flex-col gap-2">
              <Button className="bg-[#69daff] text-[#004a5d] hover:bg-[#00cffc] w-full" onClick={handleConfirm}>
                Confirm Prediction
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="text-[#a3aac4] border-[#40485d] hover:bg-[#192540] w-full">
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        ) : (
          <div className="w-full pt-4 max-h-[90vh] overflow-y-auto">
            <DrawerHeader className="text-left">
              <DrawerTitle
                ref={headingRef}
                tabIndex={-1}
                className="text-xl font-headline font-bold outline-none"
              >
                Prediction Confirmed
              </DrawerTitle>
            </DrawerHeader>
            <Receipt
              receiptId="TXN-98237498234-XYZ"
              amount="$100.00"
              partyA="0x1234...5678 (You)"
              partyB="Predictify Market Pool"
              timestamp={new Date().toISOString()}
              type="Bet Placement"
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}

function BetForm({ className }: React.ComponentProps<"form">) {
  return (
    <form className={`grid items-start gap-4 ${className}`}>
      <div className="grid gap-2">
        <Label htmlFor="amount" className="font-bold uppercase tracking-widest text-[#a3aac4] text-xs">Stake Amount (USDC)</Label>
        <div className="relative">
          <Input
            type="number"
            id="amount"
            defaultValue="100.00"
            className="bg-[#192540] border-[#40485d] font-headline text-lg h-12"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-[#a3aac4] text-sm">
            MAX
          </div>
        </div>
      </div>

      <div className="bg-[#192540]/50 rounded-xl p-4 space-y-2 border border-[#40485d]/30">
         <div className="flex justify-between items-center text-sm">
            <span className="text-[#a3aac4]">Potential Payout</span>
            <span className="font-headline font-bold text-[#29fcf3]">$136.50</span>
         </div>
         <div className="flex justify-between items-center text-xs">
            <span className="text-[#a3aac4]">Est. Slippage</span>
            <span>0.15%</span>
         </div>
      </div>
    </form>
  )
}
