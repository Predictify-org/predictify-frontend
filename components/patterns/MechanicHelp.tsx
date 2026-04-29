"use client";

import * as React from "react";
import { CircleHelp, ChevronRight } from "lucide-react";

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

export interface MechanicHelpSection {
  title: string;
  body: string;
  bullets?: string[];
}

export interface MechanicHelpContent {
  title: string;
  tooltip: string;
  summary: string;
  learnMoreLabel?: string;
  sections: MechanicHelpSection[];
  note?: string;
}

interface MechanicHelpProps {
  content: MechanicHelpContent;
  className?: string;
  defaultOpen?: boolean;
}

export function MechanicHelp({ content, className, defaultOpen = false }: MechanicHelpProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = React.useState(defaultOpen);

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
      {helpIcon}
      {isDesktop ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{learnMoreButton}</PopoverTrigger>
          <PopoverContent align="start" sideOffset={10} className="w-[24rem] rounded-2xl p-0 shadow-xl">
            <MechanicHelpPanel content={content} />
          </PopoverContent>
        </Popover>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>{learnMoreButton}</DrawerTrigger>
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

export function MechanicHelpPanel({
  content,
  className,
}: {
  content: MechanicHelpContent;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-5 rounded-[1.25rem] border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 p-5",
        className
      )}
    >
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Learn more
        </p>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">{content.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{content.summary}</p>
        </div>
      </div>

      <div className="space-y-4">
        {content.sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            {section.bullets && section.bullets.length > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-foreground/70" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {content.note ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {content.note}
        </div>
      ) : null}
    </div>
  );
}
