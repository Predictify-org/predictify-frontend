"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  backHref?: string;
  onBack?: () => void;
  className?: string;
}

// Spec: animate within 180ms using an ease-out cubic bezier.
const MORPH_TRANSITION = { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] as const };

/**
 * The trailing/active crumb, animated as a shared element across route changes.
 *
 * `layoutId` is shared between renders so Framer Motion treats the outgoing and
 * incoming crumb as the same element morphing in place (FLIP-style), while the
 * `key` (depth + label) controls when AnimatePresence actually swaps it — i.e.
 * only when the route depth or final segment changes, not on unrelated
 * re-renders of the layout that leave the trail untouched.
 */
function ActiveCrumb({ label }: { label: string }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    // Motion-safe default: swap instantaneously, no fade/slide/morph.
    return (
      <span className="text-[#69daff] font-medium tracking-widest text-xs uppercase" aria-current="page">
        {label}
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
        className="text-[#69daff] font-medium tracking-widest text-xs uppercase"
        aria-current="page"
      >
        {label}
      </motion.span>
    </AnimatePresence>
  );
}

export function Breadcrumbs({ items, backHref, onBack, className = "" }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-col gap-4 mb-6 ${className}`}>
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

      {/* Desktop & Tablet Breadcrumbs */}
      <ol className="hidden md:flex items-center gap-2 text-sm text-[#a3aac4]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`breadcrumb-${index}`} className="flex items-center">
              {item.href && !item.isCurrentPage ? (
                <Link
                  href={item.href}
                  className="hover:text-cyan-400 transition-colors uppercase tracking-widest font-medium text-xs"
                >
                  {item.label}
                </Link>
              ) : isLast ? (
                <ActiveCrumb label={item.label} />
              ) : (
                <span
                  className="text-[#a3aac4] font-medium tracking-widest text-xs uppercase"
                  aria-current={item.isCurrentPage ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span className="mx-2 flex text-slate-600">
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
