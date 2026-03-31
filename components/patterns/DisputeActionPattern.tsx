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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { AlertTriangle, UploadCloud } from "lucide-react"

export function DisputeActionPattern() {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">Raise Dispute (Desktop)</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg bg-[#0f1930] text-[#dee5ff] border-[#40485d] flex flex-col max-h-[85vh]">
          <DialogHeader className="shrink-0">
            <div className="mx-auto md:mx-0 w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <DialogTitle className="text-xl font-headline font-bold text-white text-center md:text-left">Submit a Resolution Dispute</DialogTitle>
            <DialogDescription className="text-[#a3aac4] text-center md:text-left">
              Disputes must be backed by public on-chain or oracle evidence. False disputes are subject to staking penalties.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 my-2 py-2 standard-scrollbar">
            <DisputeForm />
          </div>

          <DialogFooter className="shrink-0 sm:justify-between items-center bg-[#091328] -mx-6 -mb-6 px-6 py-4 rounded-b-lg border-t border-[#40485d]">
            <span className="text-xs text-[#a3aac4]">Max size: 5MB per upload</span>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-[#a3aac4] hover:text-white" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-red-500 text-white hover:bg-red-600" onClick={() => setOpen(false)}>
                Submit Evidence
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10 w-full flex gap-2"><AlertTriangle className="w-4 h-4"/> Raise Dispute</Button>
      </DrawerTrigger>
      {/* 90% snap point for extensive form filling */}
      <DrawerContent className="bg-[#0f1930] text-[#dee5ff] border-[#40485d] h-[90vh]">
        <DrawerHeader className="text-left border-b border-[#40485d]/50 pb-4">
          <DrawerTitle className="text-xl font-headline font-bold text-white">Submit Dispute</DrawerTitle>
          <DrawerDescription className="text-[#a3aac4]">
             Disputes must be backed by verifiable evidence.
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 py-6 overflow-y-auto flex-1">
          <DisputeForm />
        </div>
        
        <DrawerFooter className="pt-4 border-t border-[#40485d]/50 bg-[#060e20] flex-col gap-3">
          <Button className="bg-red-500 text-white flex-1 hover:bg-red-600 w-full" onClick={() => setOpen(false)}>
            Submit Evidence
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="text-[#a3aac4] border-[#40485d] hover:bg-[#192540] w-full">
              Cancel Dispute
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function DisputeForm({ className }: React.ComponentProps<"form">) {
  return (
    <form className={`grid items-start gap-6 ${className}`}>
      <div className="grid gap-2">
         <Label htmlFor="reason" className="font-bold text-white text-sm">Dispute Reason</Label>
         <Textarea 
            id="reason" 
            placeholder="Explain why the current resolution is incorrect..." 
            className="min-h-[120px] bg-[#192540] border-[#40485d] focus-visible:ring-cyan-400 resize-none text-white" 
         />
      </div>

      <div className="grid gap-2">
         <Label htmlFor="evidence" className="font-bold text-white text-sm">Supporting Link (Optional)</Label>
         <Input 
            id="evidence" 
            placeholder="https://etherscan.io/tx/..." 
            className="bg-[#192540] border-[#40485d] focus-visible:ring-cyan-400 text-white" 
         />
      </div>

      <div className="grid gap-2">
         <Label className="font-bold text-white text-sm">Attach Screenshots</Label>
         <div className="border-2 border-dashed border-[#40485d] rounded-xl p-8 flex flex-col items-center justify-center text-center bg-[#192540]/30 hover:bg-[#192540]/50 transition-colors cursor-pointer group">
            <div className="w-12 h-12 rounded-full bg-[#192540] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
               <UploadCloud className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-sm font-medium text-white mb-1">Click to upload or drag & drop</p>
            <p className="text-xs text-[#a3aac4]">PNG, JPG, PDF up to 5MB</p>
         </div>
      </div>
    </form>
  )
}
