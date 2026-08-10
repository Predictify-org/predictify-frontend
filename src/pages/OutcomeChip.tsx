
import * as React from "react";
import type { MechanicHelpContent } from "@/components/patterns/MechanicHelp";
import { MechanicHelp } from "@/components/patterns/MechanicHelp";

/**
 * OutcomeChip
 *
 * Displays a single market outcome (e.g. "Yes" / "No", or a named outcome)
 * as a tappable chip, optionally with a probability/odds badge.
 *
 * Mobile audit fixes (issue #636):
 *  - Chip no longer truncates or overflows at <=375px: label wraps onto a
 *    second line instead of clipping, and the badge drops below the label
 *    on very narrow screens instead of forcing horizontal overflow.
 *  - Minimum 44x44px tap target at all breakpoints (WCAG 2.1 AA / 2.5.5),
 *    achieved via min-height + padding rather than a fixed height so the
 *    label can still wrap without clipping the target.
 *  - Uses design tokens (CSS variables) for color so dark mode "just works"
 *    without a separate dark: branch for every color.
 *  - Focus-visible ring for keyboard users, aria-pressed for toggle state.
 */

export type OutcomeChipVariant = "yes" | "no" | "neutral";

export interface OutcomeChipProps {
  /** Outcome label, e.g. "Yes", "No", or a custom outcome name */
  label: string;
  /** Visual/semantic variant driving the token-based color */
  variant?: OutcomeChipVariant;
  /** Optional probability/odds/count shown as a trailing badge, e.g. "62%" */
  badge?: string;
  /** Whether this chip is the currently selected outcome */
  selected?: boolean;
  /** Disable interaction (e.g. market resolved/closed) */
  disabled?: boolean;
  /** Called when the chip is activated (click or keyboard) */
  onSelect?: () => void;
  /** Optional additional className for layout composition */
  className?: string;
  /**
   * Optional contextual help content. When provided, a help icon + popover
   * is rendered next to the chip label, helping first-time users understand
   * the outcome metric/field.
   */
  helpContent?: MechanicHelpContent;
}

const variantTokenMap: Record<OutcomeChipVariant, { bg: string; bgSelected: string; fg: string; border: string }> = {
  yes: {
    bg: "var(--outcome-yes-bg, #E6F6EC)",
    bgSelected: "var(--outcome-yes-bg-selected, #2FA65A)",
    fg: "var(--outcome-yes-fg, #1E7A3E)",
    border: "var(--outcome-yes-border, #2FA65A)",
  },
  no: {
    bg: "var(--outcome-no-bg, #FCEAEA)",
    bgSelected: "var(--outcome-no-bg-selected, #D64545)",
    fg: "var(--outcome-no-fg, #B23A3A)",
    border: "var(--outcome-no-border, #D64545)",
  },
  neutral: {
    bg: "var(--outcome-neutral-bg, #F0F1F3)",
    bgSelected: "var(--outcome-neutral-bg-selected, #3D4148)",
    fg: "var(--outcome-neutral-fg, #3D4148)",
    border: "var(--outcome-neutral-border, #C7C9CE)",
  },
};

export const OutcomeChip: React.FC<OutcomeChipProps> = ({
  label,
  variant = "neutral",
  badge,
  selected = false,
  disabled = false,
  onSelect,
  className = "",
  helpContent,
}) => {
  const tokens = variantTokenMap[variant];

  const handleClick = () => {
    if (disabled) return;
    onSelect?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Space/Enter handled natively by <button>; nothing extra required,
    // but guard against disabled state for assistive tech that may still
    // dispatch the event.
    if (disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
    }
  };

  return (
    <button
      type="button"
      role="button"
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        "outcome-chip",
        selected ? "outcome-chip--selected" : "",
        disabled ? "outcome-chip--disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--chip-bg": selected ? tokens.bgSelected : tokens.bg,
          "--chip-fg": selected ? "var(--outcome-selected-fg, #FFFFFF)" : tokens.fg,
          "--chip-border": tokens.border,
        } as React.CSSProperties
      }
    >
      <span className="outcome-chip__label">{label}</span>
      {badge ? <span className="outcome-chip__badge">{badge}</span> : null}
      {helpContent ? (
        <span className="outcome-chip__help" onClick={(e) => e.stopPropagation()}>
          <MechanicHelp content={helpContent} />
        </span>
      ) : null}

      <style>{`
        .outcome-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 4px 8px;

          /* WCAG 2.1 AA (2.5.5) minimum target size at every breakpoint */
          min-height: 44px;
          min-width: 44px;

          padding: 10px 14px;
          border-radius: 999px;
          border: 1.5px solid var(--chip-border);
          background-color: var(--chip-bg);
          color: var(--chip-fg);

          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          text-align: center;
          white-space: normal;      /* allow wrapping instead of clipping */
          word-break: break-word;
          overflow-wrap: anywhere;

          cursor: pointer;
          transition: background-color 120ms ease, transform 80ms ease, border-color 120ms ease;
        }

        .outcome-chip:hover:not(.outcome-chip--disabled) {
          transform: translateY(-1px);
        }

        .outcome-chip:active:not(.outcome-chip--disabled) {
          transform: translateY(0);
        }

        .outcome-chip:focus-visible {
          outline: 2px solid var(--outcome-focus-ring, #2F6FED);
          outline-offset: 2px;
        }

        .outcome-chip--disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .outcome-chip__label {
          min-width: 0;
        }

        .outcome-chip__badge {
          font-size: 12px;
          font-weight: 700;
          opacity: 0.85;
          padding: 2px 6px;
          border-radius: 999px;
          background-color: rgba(0, 0, 0, 0.06);
        }

        /* Contextual help icon: keep it compact and clickable without
           expanding the chip's focus ring or tap target. stopPropagation
           in JSX prevents the chip's onSelect from firing when the help
           icon itself is activated. */
        .outcome-chip__help {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: 2px;
          color: var(--outcome-help-fg, rgba(0, 0, 0, 0.55));
        }

        .outcome-chip__help :global(button) {
          min-height: 28px;
          min-width: 28px;
        }

        @media (prefers-contrast: more) {
          .outcome-chip__help {
            color: var(--outcome-help-fg, #000000);
          }
        }

        /* <=375px: audited breakpoint from issue #636.
           Stack label/badge and give the chip full-width tap area so
           nothing truncates and the tap target stays comfortably >=44px. */
        @media (max-width: 375px) {
          .outcome-chip {
            width: 100%;
            padding: 12px 16px;
            font-size: 15px;
            justify-content: space-between;
          }

          .outcome-chip__badge {
            font-size: 13px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .outcome-chip {
            transition: none;
          }
        }
      `}</style>
    </button>
  );
};

export default OutcomeChip;