"use client"

import * as React from "react"
import { BellRing, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAlertsStore, type PriceAlertKind } from "@/app/state/alerts"

export interface SetAlertPopoverProps {
  marketId: string
  marketTitle?: string
  disabled?: boolean
}

export function SetAlertPopover({
  marketId,
  marketTitle,
  disabled = false,
}: SetAlertPopoverProps) {
  const allAlerts = useAlertsStore((state) => state.alerts)
  const alerts = React.useMemo(
    () => allAlerts.filter((alert) => alert.marketId === marketId),
    [allAlerts, marketId]
  )
  const addAlert = useAlertsStore((state) => state.addAlert)
  const removeAlert = useAlertsStore((state) => state.removeAlert)
  const rearmAlert = useAlertsStore((state) => state.rearmAlert)
  const [kind, setKind] = React.useState<PriceAlertKind>("odds_above")
  const [threshold, setThreshold] = React.useState("50")
  const [error, setError] = React.useState("")

  const isDeadlineAlert = kind === "deadline_within"

  const handleAdd = () => {
    const value = Number(threshold)
    const valid =
      Number.isFinite(value) &&
      (isDeadlineAlert
        ? Number.isInteger(value) && value >= 1 && value <= 10080
        : value >= 1 && value <= 99)

    if (!valid) {
      setError(
        isDeadlineAlert
          ? "Enter a whole number of minutes from 1 to 10,080."
          : "Enter a probability from 1% to 99%."
      )
      return
    }

    const added = addAlert({ marketId, kind, threshold: value })
    if (!added) {
      setError("This market already has the maximum number of alerts.")
      return
    }

    setError("")
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={`Set alert${marketTitle ? ` for ${marketTitle}` : ""}`}
          className="shrink-0 gap-2"
        >
          <BellRing className="h-4 w-4" aria-hidden="true" />
          <span>Set alert</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div>
          <h2 className="font-semibold">Market alert</h2>
          <p className="text-sm text-muted-foreground">
            {marketTitle ?? "Choose a condition for this market."}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor={`alert-kind-${marketId}`} className="text-sm font-medium">
            Alert when
          </label>
          <select
            id={`alert-kind-${marketId}`}
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as PriceAlertKind)
              setError("")
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="odds_above">Probability rises above</option>
            <option value="odds_below">Probability falls below</option>
            <option value="deadline_within">Market closes within</option>
          </select>

          <label
            htmlFor={`alert-threshold-${marketId}`}
            className="text-sm font-medium"
          >
            {isDeadlineAlert ? "Minutes before close" : "Probability (%)"}
          </label>
          <input
            id={`alert-threshold-${marketId}`}
            type="number"
            min={1}
            max={isDeadlineAlert ? 10080 : 99}
            step={isDeadlineAlert ? 1 : "any"}
            value={threshold}
            onChange={(event) => {
              setThreshold(event.target.value)
              setError("")
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `alert-error-${marketId}` : undefined}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          {error && (
            <p
              id={`alert-error-${marketId}`}
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <Button type="button" className="w-full" onClick={handleAdd}>
            Add alert
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Your alerts ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts set.</p>
          ) : (
            <ul className="max-h-40 space-y-2 overflow-y-auto">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                >
                  <span>
                    {alert.kind === "deadline_within"
                      ? `Closes within ${alert.threshold} min`
                      : `${alert.kind === "odds_above" ? "Above" : "Below"} ${alert.threshold}%`}
                    {alert.firedAt !== undefined && (
                      <span className="block text-xs text-muted-foreground">
                        Fired
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {alert.firedAt !== undefined && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Re-arm alert"
                        onClick={() => rearmAlert(alert.id)}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove alert"
                      onClick={() => removeAlert(alert.id)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
