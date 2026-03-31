"use client"

import * as React from "react"

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

export function BetConfirmPattern() {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" className="bg-[#69daff] text-[#004a5d] hover:bg-[#00cffc]">Place Prediction (Desktop)</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-[#0f1930] text-[#dee5ff] border-[#40485d]">
          <DialogHeader>
            <DialogTitle className="text-xl font-headline font-bold text-white">Confirm Prediction</DialogTitle>
            <DialogDescription className="text-[#a3aac4]">
              Review your position before confirming. Once confirmed, the stake will be locked in the smart contract.
            </DialogDescription>
          </DialogHeader>
          <BetForm />
          <DialogFooter className="sm:justify-end gap-2 mt-4 flex-row">
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-[#a3aac4] hover:text-white">
              Cancel
            </Button>
            <Button className="bg-[#69daff] text-[#004a5d] hover:bg-[#00cffc]" onClick={() => setOpen(false)}>
              Confirm Prediction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="default" className="bg-[#69daff] text-[#004a5d] hover:bg-[#00cffc] w-full">Place Prediction (Mobile)</Button>
      </DrawerTrigger>
      <DrawerContent className="bg-[#0f1930] text-[#dee5ff] border-[#40485d]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-xl font-headline font-bold text-white">Confirm Prediction</DrawerTitle>
          <DrawerDescription className="text-[#a3aac4]">
           Review your position before confirming. Once confirmed, the stake will be locked in the smart contract.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4">
          <BetForm />
        </div>
        <DrawerFooter className="pt-4 flex flex-col gap-2">
          <Button className="bg-[#69daff] text-[#004a5d] hover:bg-[#00cffc] w-full" onClick={() => setOpen(false)}>
            Confirm Prediction
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="text-[#a3aac4] border-[#40485d] hover:bg-[#192540] w-full">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
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
