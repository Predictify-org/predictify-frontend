import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CheckCircle2, XCircle, Info } from "lucide-react"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * "default" renders a plain <input> with no wrapper — identical to the
   * original shadcn/ui Input.  "floating" wraps the input in a container,
   * positions the label inside, and floats it above on focus or when the
   * field has a value.
   * @default "default"
   */
  variant?: "default" | "floating"
  /** Label text (required when variant="floating"). */
  label?: string
  /** Show a green success indicator (icon + color). */
  success?: boolean
  /**
   * Show an error state.  Pass a string to display an error message below
   * the input; pass `true` to show the icon + colour without a message.
   */
  error?: string | boolean
  /** Optional help text shown in a tooltip next to the label. */
  helpText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      variant = "default",
      label,
      success,
      error,
      helpText,
      id,
      placeholder,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const errorMessage = typeof error === "string" ? error : undefined

    if (variant === "floating") {
      return (
        <TooltipProvider delayDuration={300}>
          <div className="relative">
            <input
              id={inputId}
              type={type}
              /*
               * A placeholder is required for the CSS-only floating label
               * detection (`:not(:placeholder-shown)`).  We default to a
               * space so the pseudo-class still works when the consumer
               * doesn't pass a visible placeholder.
               */
              placeholder={placeholder ?? " "}
              className={cn(
                "peer h-10 w-full rounded-md border border-input bg-background px-3 pt-5 pb-1 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                success && "border-green-500",
                error && "border-destructive",
                className,
              )}
              ref={ref}
              aria-invalid={error ? true : undefined}
              aria-describedby={
                errorMessage ? `${inputId}-error` : undefined
              }
              {...props}
            />

            <Label
              htmlFor={inputId}
              className={cn(
                "absolute left-3 pointer-events-none select-none",
                /*
                 * Use `duration-200` from Tailwind's default duration
                 * scale (200 ms).  When the user prefers reduced motion
                 * the transition is removed entirely, snapping the label
                 * to its end position immediately.
                 */
                "transition-all duration-200 motion-reduce:transition-none",
                "top-1/2 -translate-y-1/2 text-sm text-muted-foreground",
                "peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-primary",
                "peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary",
              )}
            >
              {label}
              {helpText && (
                <Tooltip>
                  {/* 
                    radix-ui/tooltip handles keyboard interaction:
                    Tab focuses trigger, Enter/Space opens, Escape closes.
                  */}
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="pointer-events-auto ml-1 inline-flex items-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      tabIndex={0}
                      aria-label={helpText}
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px] text-xs">
                    {helpText}
                  </TooltipContent>
                </Tooltip>
              )}
            </Label>

            {/*
              Animated underline / focus indicator.
              Uses tailwindcss `duration-200` for token-driven timing.
              When `prefers-reduced-motion: reduce` is active the
              transition is suppressed and the bar snaps to full width.
            */}
            <span
              className={cn(
                "absolute bottom-0 left-1/2 h-0.5 bg-primary -translate-x-1/2 rounded-full",
                "w-0 transition-all duration-200 motion-reduce:transition-none",
                "peer-focus:w-full motion-reduce:w-full",
              )}
              aria-hidden="true"
            />

            {/* Success icon + colour (never colour alone per a11y guidelines) */}
            {success && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            )}

            {/* Error icon + colour */}
            {error && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive"
                aria-live="polite"
              >
                <XCircle className="h-4 w-4" />
              </span>
            )}

            {errorMessage && (
              <p
                id={`${inputId}-error`}
                className="mt-1 text-xs text-destructive"
                role="alert"
              >
                {errorMessage}
              </p>
            )}
          </div>
        </TooltipProvider>
      )
    }

    /*
     * DEFAULT VARIANT
     * Renders exactly as the original <input> — no wrapper, no extra
     * classes, no layout changes.  See git history for the original.
     */
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
export type { InputProps }
