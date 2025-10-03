"use client";

import Link from "next/link";
import type React from "react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  endBadgeText?: string;
  className?: string;
}

export function NavItem({ href, label, icon, isActive, endBadgeText, className }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2 hover:bg-white/5",
        isActive && "bg-white/5",
        className
      )}
    >
      <span className="inline-flex items-center gap-3">
        {icon}
        {label}
      </span>
      {endBadgeText ? (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white text-[#540D8D] font-semibold text-xs px-2" aria-label={`${endBadgeText} new items`}>
          {endBadgeText}
        </span>
      ) : null}
    </Link>
  );
}


