"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaPositive?: boolean;
  tooltip?: string;
  className?: string;
}

export function KpiCard({ label, value, unit, delta, deltaPositive, tooltip, className }: KpiCardProps) {
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
            {label}
          </span>
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground">
            {value}
          </span>
          {unit && (
            <span className="text-sm text-muted-foreground font-medium">{unit}</span>
          )}
        </div>

        {delta && (
          <p className={cn("text-xs mt-1 font-medium", deltaPositive ? "text-emerald-500" : "text-destructive")}>
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
