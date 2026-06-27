"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ShortcutKey, getShortcut } from "@/lib/shortcuts";

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  shortcut?: ShortcutKey;
  keys?: string[];
  actionLabel?: string;
}

export function Kbd({ shortcut, keys: providedKeys, actionLabel, className, ...props }: KbdProps) {
  const [mounted, setMounted] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsMac(navigator.userAgent.toLowerCase().includes('mac'));
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
    setMounted(true);
  }, []);

  if (mounted && isTouch) {
    return null;
  }

  let keysToRender: string[] = [];
  
  if (shortcut) {
    const def = getShortcut(shortcut);
    if (def) {
      keysToRender = (mounted && !isMac) ? def.win : def.mac;
    }
  } else if (providedKeys) {
    keysToRender = providedKeys;
  }

  const formatKey = (k: string, isMacEnv: boolean) => {
    switch (k.toLowerCase()) {
      case 'meta': return isMacEnv ? '⌘' : 'Cmd';
      case 'ctrl': return 'Ctrl';
      case 'shift': return '⇧';
      case 'alt': return isMacEnv ? '⌥' : 'Alt';
      case 'enter': return 'Enter';
      default: return k.toUpperCase();
    }
  };

  return (
    <kbd
      className={cn(
        "hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[#540D8D33] dark:border-[#71B48D] bg-muted/50 px-1.5 font-mono text-[10px] font-medium opacity-100 whitespace-nowrap",
        !mounted && "invisible",
        className
      )}
      {...props}
    >
      {actionLabel && <span className="mr-1 font-sans">{actionLabel}</span>}
      {keysToRender.map((k, i) => {
        const isMacEnv = mounted ? isMac : true;
        return (
          <React.Fragment key={i}>
            <span className={cn(k.length === 1 && "text-xs")} aria-hidden="true">
              {formatKey(k, isMacEnv)}
            </span>
          </React.Fragment>
        );
      })}
    </kbd>
  );
}
