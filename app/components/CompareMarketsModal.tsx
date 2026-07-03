"use client"

import * as React from "react"
import {
  CalendarClock,
  CircleDollarSign,
  GitCompareArrows,
  Trophy,
  Users,
} from "lucide-react"

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

export interface CompareMarket {
  id: string
  title: string
  category: string
  deadline: string
  totalPool: number
  participants: number
  topOutcome: string
  topOdds: number
  resolutionCriteria: string
  status?: "open" | "closing" | "closed"
}

export interface CompareMarketsModalProps {
  markets: CompareMarket[]
  trigger?: React.ReactNode
  className?: string
}

const statusLabel: Record<NonNullable<CompareMarket["status"]>, string> = {
  open: "Open",
  closing: "Closing soon",
  closed: "Closed",
}

const statusClassName: Record<NonNullable<CompareMarket["status"]>, string> = {
  open: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  closing: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  closed: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
}

function formatCurrency(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function formatDeadline(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 px-3 py-2">
      <dt className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function MarketPanel({ market, leader }: { market: CompareMarket; leader: boolean }) {
  const status = market.status ?? "open"

  return (
    <article
      aria-label={`${market.title} comparison details`}
      className={cn(
        "flex h-full flex-col gap-4 p-4",
        leader && "bg-primary/[0.03]"
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h3 className="text-base font-semibold leading-snug text-foreground">
              {market.title}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{market.category}</Badge>
              <Badge className={statusClassName[status]}>{statusLabel[status]}</Badge>
            </div>
          </div>
          {leader && (
            <Badge variant="secondary" className="shrink-0">
              Higher pool
            </Badge>
          )}
        </div>

        <dl className="space-y-2">
          <MetricRow
            icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
            label="Liquidity"
            value={formatCurrency(market.totalPool)}
          />
          <MetricRow
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label="Participants"
            value={market.participants.toLocaleString()}
          />
          <MetricRow
            icon={<Trophy className="h-4 w-4" aria-hidden="true" />}
            label="Top outcome"
            value={
              <span>
                {market.topOutcome}{" "}
                <span className="text-muted-foreground">
                  ({market.topOdds.toFixed(1)}x)
                </span>
              </span>
            }
          />
          <MetricRow
            icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
            label="Deadline"
            value={formatDeadline(market.deadline)}
          />
        </dl>
      </div>

      <div className="mt-auto rounded-md border border-dashed p-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Resolution criteria
        </p>
        <p className="mt-1 text-sm leading-6 text-foreground">
          {market.resolutionCriteria}
        </p>
      </div>
    </article>
  )
}

export function CompareMarketsModal({
  markets,
  trigger,
  className,
}: CompareMarketsModalProps) {
  const comparedMarkets = markets.slice(0, 2)
  const highestPool = Math.max(0, ...comparedMarkets.map((market) => market.totalPool))

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className={cn("gap-2", className)}>
            <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
            Compare markets
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare markets</DialogTitle>
          <DialogDescription>
            Review two markets side by side before deciding where to predict.
          </DialogDescription>
        </DialogHeader>

        {comparedMarkets.length < 2 ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Select two markets to compare liquidity, odds, participation, and
            resolution criteria.
          </div>
        ) : (
          <div className="grid overflow-hidden rounded-md border sm:grid-cols-2 sm:divide-x">
            {comparedMarkets.map((market) => (
              <MarketPanel
                key={market.id}
                market={market}
                leader={market.totalPool === highestPool}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
