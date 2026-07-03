"use client"

import * as React from "react"
import { CalendarCheck, ClipboardCheck, Info } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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

interface AboutMarketModalProps {
  marketTitle: string
  category: string
  description: string
  resolutionCriteria: string
  deadlineLabel?: string
  className?: string
}

export function AboutMarketModal({
  marketTitle,
  category,
  description,
  resolutionCriteria,
  deadlineLabel,
  className,
}: AboutMarketModalProps) {
  const summaryId = React.useId()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
          aria-label={`About this market: ${marketTitle}`}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
          About this market
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        aria-describedby={summaryId}
      >
        <DialogHeader>
          <DialogTitle>About this market</DialogTitle>
          <DialogDescription>
            Review the market premise, key details, and resolution criteria.
          </DialogDescription>
        </DialogHeader>

        <p id={summaryId} className="sr-only">
          Screen reader summary: {marketTitle} is a {category} market.
          {deadlineLabel ? ` It closes on ${deadlineLabel}.` : ""}{" "}
          {resolutionCriteria}
        </p>

        <div className="space-y-5">
          <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{category}</Badge>
              {deadlineLabel ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {deadlineLabel}
                </span>
              ) : null}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {marketTitle}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </section>

          <section className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold text-foreground">
                Resolution criteria
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {resolutionCriteria}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
