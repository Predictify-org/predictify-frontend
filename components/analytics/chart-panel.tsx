"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartPanelProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Height of the chart area. Defaults to h-56 on mobile, h-72 on sm+ */
  chartHeight?: string;
}

/**
 * Wrapper for all chart panels.
 * Enforces consistent padding, title/description placement, and responsive height.
 */
export function ChartPanel({ title, description, children, className, chartHeight }: ChartPanelProps) {
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-2 px-4 sm:px-5 pt-4 sm:pt-5">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn("px-2 sm:px-4 pb-4", chartHeight ?? "h-56 sm:h-72")}>
        {children}
      </CardContent>
    </Card>
  );
}
