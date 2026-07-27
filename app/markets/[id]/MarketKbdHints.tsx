"use client";

/**
 * MarketKbdHints
 *
 * Renders a keyboard-shortcut hint strip at the bottom of the MarketDetail
 * page and registers the corresponding global keydown listeners.
 *
 * Shortcuts exposed:
 *  - ⌘/Ctrl + Shift + S → Share this market   (calls `onShare`)
 *  - ⌘/Ctrl + B         → Place a bet         (calls `onPlaceBet`)
 *
 * Accessibility:
 *  - The <kbd> elements are `aria-hidden="true"` — the hints are a
 *    progressive-enhancement convenience for keyboard-proficient users.
 *    Screen-reader users discover actions through the normal interactive
 *    elements (Share button, BetForm) rather than these hints.
 *  - The hint strip itself carries `aria-hidden="true"` for the same reason.
 *  - Touch-device detection: the strip is hidden on pointer:coarse viewports
 *    (phones/tablets) where keyboard shortcuts are irrelevant, avoiding
 *    visual clutter. This is handled post-hydration to avoid SSR mismatch.
 *  - Reduced-motion: no animations are used; the strip is purely static text.
 *
 * Responsive:
 *  - `hidden sm:flex` — not shown on narrow (<640 px) viewports where there
 *    is no physical keyboard.
 *
 * Dark-mode:
 *  - All colours use design-token classes (bg-muted, text-muted-foreground,
 *    border-border) so they adapt automatically.
 *
 * @see lib/shortcuts.ts  — canonical shortcut definitions
 * @see components/ui/kbd.tsx — Kbd primitive used elsewhere in the app
 */

import React, { useEffect, useState, useCallback } from "react";
import KbdHint from "@/src/components/KbdHint";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketKbdHintsProps {
  /**
   * Called when the user triggers the "Share market" shortcut
   * (⌘/Ctrl + Shift + S).  If omitted the shortcut is still registered but
   * fires a no-op, keeping the hint visible as documentation.
   */
  onShare?: () => void;
  /**
   * Called when the user triggers the "Place bet" shortcut (⌘/Ctrl + B).
   * Typically scrolls the BetForm into view or focuses the amount input.
   * If omitted the shortcut fires a no-op.
   */
  onPlaceBet?: () => void;
}

// ---------------------------------------------------------------------------
// Hint item definition
// ---------------------------------------------------------------------------

interface HintItem {
  /** Accessible label describing what the shortcut does. */
  label: string;
  /** Keys to render as <kbd> chips — Mac-first, formatted by KbdHint. */
  macKeys: string[];
  /** Keys rendered on non-Mac platforms. */
  winKeys: string[];
  /** data-testid suffix for the hint row, e.g. "share" → data-testid="kbd-hint-share" */
  testId: string;
}

const HINTS: HintItem[] = [
  {
    label: "Share market",
    macKeys: ["⌘", "⇧", "S"],
    winKeys: ["Ctrl", "⇧", "S"],
    testId: "share",
  },
  {
    label: "Place bet",
    macKeys: ["⌘", "B"],
    winKeys: ["Ctrl", "B"],
    testId: "place-bet",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarketKbdHints({ onShare, onPlaceBet }: MarketKbdHintsProps) {
  const [isMac, setIsMac] = useState(true); // default mac until hydrated
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsMac(navigator.userAgent.toLowerCase().includes("mac"));
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // Register global keydown listeners for the two shortcuts.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // ⌘/Ctrl + Shift + S — Share market
      if (meta && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onShare?.();
        return;
      }

      // ⌘/Ctrl + B — Place bet
      if (meta && !e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        onPlaceBet?.();
        return;
      }
    },
    [onShare, onPlaceBet]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Hide on touch devices — keyboard shortcuts are irrelevant there.
  if (isTouch) return null;

  return (
    /*
     * hidden sm:flex — only show on ≥ 640 px where a physical keyboard is
     * likely present.  On narrower viewports the strip is completely absent
     * from the layout so it never adds unwanted spacing.
     */
    <div
      aria-hidden="true"
      data-testid="market-kbd-hints"
      className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 mt-3 border-t border-border"
    >
      {HINTS.map(({ label, macKeys, winKeys, testId }) => {
        const keys = isMac ? macKeys : winKeys;
        return (
          <span
            key={testId}
            data-testid={`kbd-hint-${testId}`}
            className="flex items-center gap-1 text-[11px] text-muted-foreground"
          >
            {/* Label */}
            <span className="mr-0.5">{label}</span>
            {/* Key chips */}
            {keys.map((k, i) => (
              <KbdHint key={i}>{k}</KbdHint>
            ))}
          </span>
        );
      })}
    </div>
  );
}
