"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Maskes a wallet address or arbitrary string for display purposes.
 *
 * Shows only the first 4 and last 4 characters separated by an ellipsis.
 * For very short strings (<=8 chars) a fixed mask is returned so the
 * underlying value is never exposed. An empty string stays empty.
 */
function maskAddress(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 4)}.…${trimmed.slice(-4)}`;
}

/**
 * Props for the CopyAddress component.
 */
export interface CopyAddressProps {
  /**
   * The address (or any text) to copy to the clipboard when the button is
   * activated.  Typically a Stellar public key or contract address.
   */
  address: string;

  /**
   * Optional human-readable label displayed inside the button alongside the
   * copy icon.  Defaults to a masked version of the `address` (first/last
   * 4 chars) to avoid exposing sensitive wallet data in printed or
   * screen-shared views.  Pass an empty string to render an icon-only button.
   */
  label?: string;

  /**
   * Button `size` forwarded to the underlying shadcn/ui `Button`.
   * Accepts: "default" | "sm" | "lg" | "icon".
   * Defaults to "sm".
   */
  size?: "default" | "sm" | "lg" | "icon";

  /**
   * Button `variant` forwarded to the underlying shadcn/ui `Button`.
   * Accepts: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link".
   * Defaults to "outline".
   */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

  /**
   * Additional CSS classes applied to the button element.
   */
  className?: string;

  /**
   * Milliseconds the button stays in its "copied" state before resetting.
   * Defaults to 2000 ms.
   */
  resetDelay?: number;
}

/**
 * CopyAddress
 *
 * A universal, standalone copy-to-clipboard button for addresses and short
 * strings.  Designed for the GrantFox FWC26 campaign and any other surface in
 * Predictify that needs a one-click copy action.
 *
 * Features:
 * - Copies `address` to the system clipboard via the Clipboard API.
 * - Shows a success toast ("Copied!") on success and an error toast on failure.
 * - Transitions the icon from `<Copy>` to `<Check> for `resetDelay` ms to
 *   provide immediate visual feedback without relying on the toast alone.
 * - Fully keyboard-accessible (<button> element, natural tab stop).
 * - WCAG 2.1 AA: accessible `aria-label`, live-region announcement for screen
 *   readers, and a visible focus ring via the design system's ring utilities.
 * - Respects dark mode through design tokens.
 * - All timeouts are cleared on unmount to prevent state updates on an
 *   unmounted component.
 * - By default the visible label is a masked version of the address so the
 *   full wallet address is not exposed in printed or screen-shared views.
 *   The full address is still copied to the clipboard.
 *
 * @example
 * // Minimal - copies a Stellar address, shows a masked label by default
 * <CopyAddress address="GABC...XYZ" />
 *
 * @example
 * // With a short human-readable label and a ghost variant
 * <CopyAddress address="GABC...XYZ" label="Copy wallet" variant="ghost" />
 *
 * @example
 * // Icon-only copy button (no text label)
 * <CopyAddress address="GABC...XYZ" label="" size="icon" />
 */
export function CopyAddress({
  address,
  label,
  size = "sm",
  variant = "outline",
  className,
  resetDelay = 2000,
}: CopyAddressProps) {
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();
  const timeoutRef = React.useRef><ReturnType of setTimeout>>();

  // Clear any pending timeout on unmount to prevent state updates after the
  // component has been removed from the tree.
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = React.useCallback(async () => {
    // Guard against environments that do not expose the Clipboard API (e.g.
    // non-secure contexts or older browsers).
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard?.writeText
    ) {
      toast({
        title: "Copy not supported",
        description: "Your browser does not support copying to clipboard.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);

      toast({
        title: "Copied!",
        description: "Address copied to clipboard.",
      });

      // Clear any existing timeout so rapid clicks don't stack up.
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, resetDelay);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy the address. Please try again.",
        variant: "destructive",
      });
    }
  }, [address, resetDelay, toast]);

  // Determine the visible label: explicit `label` prop takes priority, then
  // fall back to a masked version of the address so the full value is never
  // rendered.
  const displayLabel = label !== undefined ? label : maskAddress(address);

  // For icon-only mode (size="icon" or empty label) we derive the aria-label
  // generically so the wallet address is not exposed to assistive tech.
  const ariaLabel =
    displayLabel.trim().length > 0
      ? `Copy ${displayLabel}`
      : "Copy address";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-1.5", className)}
      onClick={handleCopy}
      aria-label={ariaLabel}
      // aria-pressed conveys the transient "copied" state to assistive tech.
      aria-pressed={copied}
    >
      {copied ? (
        <Check
          className="h-3.5 w-3.5 text-green-500 shrink-0"
          aria-hidden="true"
        />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}

      {/* Render text only when a label is present (non-empty string). */}
      {displayLabel.trim().length > 0 && (
        <span>{copied ? "Copied" : displayLabel}</span>
      ))}

      {/* Hidden live region for screen-reader announcement. */}
      <span className="sr-only" aria-live="polite">
        {copied ? "Address copied to clipboard" : ""}
      </span>
    </Button>
  );
}
