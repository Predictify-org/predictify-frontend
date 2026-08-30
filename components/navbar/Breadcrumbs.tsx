"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft, MoreHorizontal } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  collapseBreadcrumbTrail,
  truncateMiddle,
  type BreadcrumbItem,
} from "@/lib/breadcrumbs";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  backHref?: string;
  onBack?: () => void;
  className?: string;
}

// Spec: animate within 180ms using an ease-out cubic bezier.
const MORPH_TRANSITION = { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] as const };

const CRUMB_TEXT_CLASSNAME = "font-medium tracking-widest text-xs uppercase";

/**
 * The trailing/active crumb, animated as a shared element across route changes.
 *
 * `layoutId` is shared between renders so Framer Motion treats the outgoing and
 * incoming crumb as the same element morphing in place (FLIP-style), while the
 * `key` (depth + label) controls when AnimatePresence actually swaps it — i.e.
 * only when the route depth or final segment changes, not on unrelated
 * re-renders of the layout that leave the trail untouched.
 *
 * `label` (the full text) drives the key/aria so morph identity and screen
 * reader output are unaffected by truncation; `displayLabel` is what
 * actually renders, and may be a middle-ellipsized version of `label`.
 */
function ActiveCrumb({ label, displayLabel }: { label: string; displayLabel: string }) {
  const shouldReduceMotion = useReducedMotion();
  const isTruncated = displayLabel !== label;
  const className = `block truncate text-[#69daff] ${CRUMB_TEXT_CLASSNAME}`;

  if (shouldReduceMotion) {
    // Motion-safe default: swap instantaneously, no fade/slide/morph.
    return (
      <span
        className={className}
        aria-current="page"
        aria-label={isTruncated ? label : undefined}
        title={isTruncated ? label : undefined}
      >
        {displayLabel}
      </span>
    );
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={label}
        layoutId="active-breadcrumb"
        layout="position"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={MORPH_TRANSITION}
        className={className}
        aria-current="page"
        aria-label={isTruncated ? label : undefined}
        title={isTruncated ? label : undefined}
      >
        {displayLabel}
      </motion.span>
    </AnimatePresence>
  );
}

export function Breadcrumbs({ items, backHref, onBack, className = "" }: BreadcrumbsProps) {
  const trail = collapseBreadcrumbTrail(items);
  const hasMobileBackControl = Boolean(backHref || onBack);

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex min-w-0 flex-col gap-4 mb-6 ${className}`}
    >
      {/* Mobile Back Button */}
      {(backHref || onBack) && (
        <div className="md:hidden flex items-center">
          {backHref ? (
            <Link href={backHref} className="flex items-center text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Back</span>
            </Link>
          ) : (
             <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Back</span>
            </button>
          )}
        </div>
      )}

      {/* An explicit back control replaces the trail on mobile; otherwise keep
          the responsive trail available at every breakpoint. */}
      <ol
        className={`${hasMobileBackControl ? "hidden md:flex" : "flex"} w-full min-w-0 max-w-full items-center gap-2 text-sm text-[#a3aac4]`}
      >
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;

          if ("isEllipsis" in item) {
            const hiddenCount = item.collapsedItems.length;
            return (
              <li key="breadcrumb-ellipsis" className="flex shrink-0 items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center justify-center rounded p-0.5 text-[#a3aac4] hover:text-cyan-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060e20]"
                      aria-label={`Show ${hiddenCount} hidden breadcrumb ${hiddenCount === 1 ? "item" : "items"}`}
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {item.collapsedItems.map((hidden, hiddenIndex) => (
                      <DropdownMenuItem key={`${hidden.label}-${hiddenIndex}`} asChild>
                        {hidden.href ? (
                          <Link href={hidden.href}>{hidden.label}</Link>
                        ) : (
                          <span>{hidden.label}</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {!isLast && (
                  <span className="mx-2 flex shrink-0 text-slate-600" aria-hidden="true">
                    <span className="text-[#a3aac4]/50">/</span>
                  </span>
                )}
              </li>
            );
          }

          const displayLabel = truncateMiddle(item.label);
          const isTruncated = displayLabel !== item.label;

          return (
            <li key={`breadcrumb-${index}`} className="flex items-center min-w-0">
              {item.href && !item.isCurrentPage ? (
                <Link
                  href={item.href}
                  className={`block truncate hover:text-cyan-400 transition-colors ${CRUMB_TEXT_CLASSNAME}`}
                  aria-label={isTruncated ? item.label : undefined}
                  title={isTruncated ? item.label : undefined}
                >
                  {displayLabel}
                </Link>
              ) : item.isCurrentPage ? (
                <ActiveCrumb label={item.label} displayLabel={displayLabel} />
              ) : (
                <span
                  className={`block truncate text-[#a3aac4] ${CRUMB_TEXT_CLASSNAME}`}
                  aria-current={item.isCurrentPage ? "page" : undefined}
                  aria-label={isTruncated ? item.label : undefined}
                  title={isTruncated ? item.label : undefined}
                >
                  {displayLabel}
                </span>
              )}

              {!isLast && (
                <span className="mx-2 flex shrink-0 text-slate-600" aria-hidden="true">
                  <span className="text-[#a3aac4]/50">/</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
