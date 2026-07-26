import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import type { ShortcutKey } from "@/lib/shortcuts";
import type { HTMLAttributes } from "react";

export interface KbdHintProps extends HTMLAttributes<HTMLSpanElement> {
  shortcut?: ShortcutKey;
  keys?: string[];
  actionLabel?: string;
  label?: string;
  srLabel?: string;
}

export function KbdHint({
  shortcut = "confirmBet",
  keys,
  actionLabel,
  label = "Press",
  srLabel,
  className,
  ...props
}: KbdHintProps) {
  const screenReaderLabel = srLabel ?? `Keyboard shortcut${shortcut ? `: ${shortcut}` : ""}`;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[11px] text-white/70", className)}
      {...props}
    >
      <span className="sr-only">{screenReaderLabel}</span>
      <span aria-hidden="true" className="font-medium text-white/70">
        {label}
      </span>
      <Kbd
        shortcut={shortcut}
        keys={keys}
        actionLabel={actionLabel}
        className="inline-flex"
      />
    </span>
  );
}
