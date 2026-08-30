"use client";

import * as React from "react";
import { CircleHelp, ChevronRight } from "lucide-react";

import { useLongPress } from "@/hooks/use-long-press";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MechanicHelpContent } from "@/components/patterns/MechanicHelp";
import { MechanicHelpPanel } from "@/components/patterns/MechanicHelp";

interface LongPressHelpProps {
  content: MechanicHelpContent;
  className?: string;
}

/**
 * LongPressHelp — touch-friendly contextual help chip.
 *
 * Desktop: hover tooltip + click "Learn more" to open popover/drawer.
 * Mobile:  long-press (600 ms) opens the same popover/drawer directly.
 *
 * Keyboard: Enter or Space opens the help panel (parity with long-press).
 */
export function LongPressHelp({ content, className }: LongPressHelpProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = React.useState(false);

  const openHelp = React.useCallback(() => {
    setOpen(true);
  }, []);

  const longPressHandlers = useLongPress({
    onLongPress: openHelp,
    delay: 600,
    moveThreshold: 10,
  });

  const learnMoreLabel = content.learnMoreLabel ?? "Learn more";

  const helpIcon = (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Show quick help for ${content.title}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-56 text-xs leading-relaxed">
          <p>{content.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const learnMoreButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-auto px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
    >
      {learnMoreLabel}
      <ChevronRight className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {isDesktop ? (
        <>
          {helpIcon}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{learnMoreButton}</PopoverTrigger>
            <PopoverContent align="start" sideOffset={10} className="w-[24rem] rounded-2xl p-0 shadow-xl">
              <MechanicHelpPanel content={content} />
            </PopoverContent>
          </Popover>
        </>
      ) : (
        <button
          type="button"
          {...longPressHandlers}
          aria-label={`Long press for help: ${content.title}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-2 py-1 text-xs text-muted-foreground",
            "transition-colors hover:border-foreground/30 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "active:bg-accent"
          )}
        >
          <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{content.title}</span>
        </button>
      )}

      {/* Mobile drawer — opens on long-press or keyboard activation */}
      {!isDesktop && (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh] rounded-t-3xl">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{content.title}</DrawerTitle>
              <DrawerDescription>{content.summary}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              <MechanicHelpPanel content={content} />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
