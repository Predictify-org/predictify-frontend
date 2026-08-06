"use client"

import { HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface HelpPopoverProps {
  /** Title displayed at the top of the popover */
  title: string
  /** Main body content explaining the setting */
  description: string
  /** Optional tips for first-time users */
  tips?: string[]
}

/**
 * A contextual help popover triggered by a small (?) icon.
 * Designed for first-time users who need a quick explanation
 * of a setting's purpose and impact.
 */
export function HelpPopover({ title, description, tips }: HelpPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
          aria-label={`Help: ${title}`}
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="max-w-xs space-y-3 p-4"
      >
        <div className="space-y-1.5">
          <p className="text-sm font-semibold leading-none">{title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {tips && tips.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Tips for first-time users
            </p>
            <ul className="space-y-1">
              {tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground"
                >
                  <span className="mt-0.5 block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}