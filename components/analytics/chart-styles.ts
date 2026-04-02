/**
 * Shared chart style constants.
 * Use these across all Recharts instances to keep axes, tooltips, and colors consistent.
 */

/** Palette — maps semantic series names to CSS custom properties from globals.css */
export const CHART_COLORS = {
  primary:     "hsl(var(--chart-1))",
  secondary:   "hsl(var(--chart-2))",
  tertiary:    "hsl(var(--chart-3))",
  quaternary:  "hsl(var(--chart-4))",
  quinary:     "hsl(var(--chart-5))",
} as const;

/** Axis tick style — applied to XAxis and YAxis tickStyle / tick props */
export const AXIS_TICK_STYLE = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
  fontFamily: "inherit",
} as const;

/** Cartesian grid style */
export const GRID_STYLE = {
  stroke: "hsl(var(--border))",
  strokeDasharray: "3 3",
  strokeOpacity: 0.5,
} as const;

/** Tooltip wrapper class — used via ChartTooltipContent className */
export const TOOLTIP_CLASS =
  "rounded-lg border border-border/50 bg-popover px-3 py-2 text-xs shadow-lg text-popover-foreground";

/** Standard chart margins — keeps axis labels from clipping */
export const CHART_MARGIN = { top: 4, right: 16, bottom: 0, left: 0 } as const;
