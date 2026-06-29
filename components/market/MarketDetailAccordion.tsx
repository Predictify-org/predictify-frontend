"use client";

/**
 * MarketDetailAccordion
 *
 * Accessible accordion primitive for market detail sections.
 * Implements ARIA disclosure semantics (WCAG 2.1 AA) using
 * Radix UI's AccordionPrimitive under the hood.
 *
 * Usage:
 *   <MarketDetailAccordion sections={[
 *     { id: "overview", label: "Overview", content: <p>...</p> },
 *     { id: "rules",    label: "Rules",    content: <p>...</p> },
 *   ]} />
 */

import * as React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export interface MarketDetailSection {
  /** Unique identifier used as the accordion item value */
  id: string;
  /** Visible label rendered in the trigger button */
  label: string;
  /** Content revealed when the section is expanded */
  content: React.ReactNode;
  /** Optional additional class names for the item wrapper */
  className?: string;
}

interface MarketDetailAccordionProps {
  sections: MarketDetailSection[];
  /**
   * Which section(s) should be open by default.
   * Pass a single id for type="single", or an array for type="multiple".
   */
  defaultOpen?: string | string[];
  /**
   * "single" – only one section open at a time (default).
   * "multiple" – multiple sections may be open simultaneously.
   */
  type?: "single" | "multiple";
  /** Additional class names for the root Accordion element */
  className?: string;
}

/**
 * Renders a list of collapsible market-detail sections with full
 * keyboard navigation and ARIA disclosure semantics provided by
 * Radix UI AccordionPrimitive.
 *
 * Keyboard support (per WAI-ARIA Accordion pattern):
 *   Enter / Space  – toggle focused section
 *   Tab / Shift+Tab – move focus between triggers
 *   Home / End     – jump to first / last trigger
 */
export function MarketDetailAccordion({
  sections,
  defaultOpen,
  type = "single",
  className,
}: MarketDetailAccordionProps) {
  if (!sections || sections.length === 0) {
    return null;
  }

  const sharedProps = {
    className: cn("w-full", className),
    collapsible: true as const,
  };

  if (type === "multiple") {
    const defaultValue = Array.isArray(defaultOpen)
      ? defaultOpen
      : defaultOpen
      ? [defaultOpen]
      : undefined;

    return (
      <Accordion type="multiple" defaultValue={defaultValue} {...sharedProps}>
        {sections.map((section) => (
          <SectionItem key={section.id} section={section} />
        ))}
      </Accordion>
    );
  }

  // type === "single"
  const defaultValue =
    typeof defaultOpen === "string" ? defaultOpen : undefined;

  return (
    <Accordion type="single" defaultValue={defaultValue} {...sharedProps}>
      {sections.map((section) => (
        <SectionItem key={section.id} section={section} />
      ))}
    </Accordion>
  );
}

/** Internal helper — renders a single accordion section */
function SectionItem({ section }: { section: MarketDetailSection }) {
  return (
    <AccordionItem
      value={section.id}
      className={cn("border-border", section.className)}
      // aria-label is inherited from the trigger's text content via
      // AccordionPrimitive.Header + AccordionPrimitive.Trigger
    >
      <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-primary">
        {section.label}
      </AccordionTrigger>
      <AccordionContent className="text-sm text-muted-foreground">
        {section.content}
      </AccordionContent>
    </AccordionItem>
  );
}
