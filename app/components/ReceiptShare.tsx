"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Download, ExternalLink, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ReceiptShareProps {
  receiptId: string
  marketTitle: string
  outcome: string
  amount: string
  timestamp: string
  campaign?: string
  className?: string
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return "Pending confirmation"
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function ReceiptShare({
  receiptId,
  marketTitle,
  outcome,
  amount,
  timestamp,
  campaign = "GrantFox FWC26",
  className,
}: ReceiptShareProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(
    () => `https://predictify.app/receipts/${receiptId}`,
    [receiptId],
  )

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return
    }

    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const handleDownload = () => {
    const payload = [
      `Receipt: ${receiptId}`,
      `Market: ${marketTitle}`,
      `Outcome: ${outcome}`,
      `Amount: ${amount}`,
      `Confirmed: ${formatTimestamp(timestamp)}`,
      `Campaign: ${campaign}`,
    ].join("\n")

    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `receipt-${receiptId}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <Share2 className="h-4 w-4" />
          Share receipt
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share your prediction receipt</DialogTitle>
          <DialogDescription>
            Share a polished receipt card for this completed prediction with your audience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-4 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                  {campaign}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
                    Prediction confirmed
                  </p>
                  <h3 className="text-2xl font-semibold text-foreground">{marketTitle}</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Outcome</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{outcome}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Amount</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">{amount}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-border/60 bg-background/80 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Receipt ID</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{receiptId}</p>
                <p className="mt-4 text-sm text-muted-foreground">{formatTimestamp(timestamp)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy Link"}
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download summary
            </Button>
            <Button type="button" variant="ghost" className="gap-2" asChild>
              <a href={shareUrl} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="h-4 w-4" />
                Open link
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
