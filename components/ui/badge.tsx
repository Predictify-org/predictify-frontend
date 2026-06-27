import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge component with a unified taxonomy.
 *
 * Variants:
 * - info: neutral informational badge (e.g., blue)
 * - success: positive state (green)
 * - warning: cautionary state (amber/orange)
 * - danger: error/destructive state (red)
 * - neutral: subtle gray badge
 * - default, secondary, destructive, outline: kept for backward compatibility
 *
 * Sizes:
 * - sm: small badge
 * - md: medium (default) badge
 * - lg: large badge
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        info: "border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
        success: "border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
        danger: "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
        neutral: "border-slate-500/30 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px] leading-3 gap-0.5",
        md: "px-2.5 py-0.5 text-xs gap-1",
        lg: "px-3 py-1 text-sm gap-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }

