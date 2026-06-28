"use client";

import React, { useState, useEffect, useRef, useMemo, useId } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import {
  Search as SearchIcon,
  Loader2,
  TrendingUp,
  Trophy,
  Building2,
  CircleDollarSign,
  LineChart,
  User,
  HelpCircle,
  Settings as SettingsIcon,
  Pin as PinIcon,
  History,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEventsStore } from "@/lib/events-store";
import { getPinnedActions } from "@/lib/command-palette/pins";
import type { PinnedAction } from "@/lib/command-palette/pins";
import { getRecentMarkets, addRecentMarket } from "@/lib/command-palette/recents";
import type { RecentMarket } from "@/lib/command-palette/recents";

// Lucide icon components mapper for pinned actions
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CircleDollarSign,
  Trophy,
  User,
  HelpCircle,
  Settings: SettingsIcon,
};


interface SearchInputProps {
  className?: string;
  placeholder?: string;
  onSubmit?: (value: string) => void;
  variant?: "default" | "sidebar";
}

export function SearchInput({
  className,
  placeholder = "Search for token, event, wallet address",
  onSubmit,
  variant = "default",
}: SearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  // Local list states for empty-state suggestion items
  const [pinnedActions, setPinnedActions] = useState<PinnedAction[]>([]);
  const [recentMarkets, setRecentMarkets] = useState<RecentMarket[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const listboxId = useId();
  const getOptionId = (index: number) => `${listboxId}-option-${index}`;

  const events = useEventsStore((state) => state.events);

  const filteredEvents = useMemo(() => {
    if (!value.trim()) return [];
    return events.filter(e =>
      e.title.toLowerCase().includes(value.toLowerCase()) ||
      e.category.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5);
  }, [events, value]);

  // Load pinned actions and recents dynamically when dropdown opens or value changes
  useEffect(() => {
    if (isOpen) {
      setPinnedActions(getPinnedActions());
      setRecentMarkets(getRecentMarkets());
    }
  }, [isOpen, value]);

  // Map empty state pinned actions + recent items to a single flat index list for navigation
  const emptyStateItems = useMemo(() => {
    const items: Array<
      | { type: "pin"; id: string; label: string; url: string; iconName: string }
      | { type: "recent"; id: string; title: string; category: string; odds: number }
    > = [];
    
    pinnedActions.forEach(p => {
      items.push({ type: "pin", ...p });
    });
    
    recentMarkets.forEach(m => {
      items.push({ type: "recent", ...m });
    });
    
    return items;
  }, [pinnedActions, recentMarkets]);

  // Handle Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    setSelectedIndex(-1);

    if (val.trim()) {
      setIsOpen(true);
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 300);
    } else {
      // Keep open to show pinned actions and recent markets in empty state
      setIsOpen(true);
    }
  };

  const handleSelect = (title: string, marketId: string) => {
    // Record selected market in recently visited list
    const matched = events.find(e => e.id === marketId);
    if (matched) {
      addRecentMarket({
        id: matched.id,
        title: matched.title,
        category: matched.category,
        odds: matched.odds,
      });
    }
    
    setIsOpen(false);
    setValue(title);
    onSubmit?.(title);
  };

  const handleCommandNavigate = (url: string) => {
    setIsOpen(false);
    router.push(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen) {
      setIsOpen(true);
    }

    const hasValue = value.trim().length > 0;
    const maxIndex = hasValue ? filteredEvents.length - 1 : emptyStateItems.length - 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Tab") {
      // Focus trapping/Virtual focus cycling within command palette suggestions
      if (maxIndex >= 0) {
        e.preventDefault();
        setSelectedIndex(prev => {
          if (e.shiftKey) {
            return prev > 0 ? prev - 1 : maxIndex;
          } else {
            return prev < maxIndex ? prev + 1 : 0;
          }
        });
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hasValue) {
        if (selectedIndex >= 0 && selectedIndex < filteredEvents.length) {
          const selected = filteredEvents[selectedIndex];
          handleSelect(selected.title, selected.id);
        } else {
          // Check for typed commands first
          const cmd = value.trim().toLowerCase();
          if (cmd === "/markets") {
            handleCommandNavigate("/events");
          } else if (cmd === "/claim") {
            handleCommandNavigate("/mypredictions?tab=completed");
          } else if (cmd === "/help") {
            handleCommandNavigate("/help");
          } else {
            onSubmit?.(value.trim());
            setIsOpen(false);
          }
        }
      } else {
        // Selection in empty state
        if (selectedIndex >= 0 && selectedIndex < emptyStateItems.length) {
          const selected = emptyStateItems[selectedIndex];
          if (selected.type === "pin") {
            handleCommandNavigate(selected.url);
          } else {
            handleSelect(selected.title, selected.id);
          }
        }
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category.toLowerCase()) {
      case 'football': return <Trophy className="h-4 w-4" aria-hidden="true" />;
      case 'politics': return <Building2 className="h-4 w-4" aria-hidden="true" />;
      case 'crypto': return <CircleDollarSign className="h-4 w-4" aria-hidden="true" />;
      case 'stocks': return <LineChart className="h-4 w-4" aria-hidden="true" />;
      default: return <TrendingUp className="h-4 w-4" aria-hidden="true" />;
    }
  };

  const isSidebar = variant === "sidebar";
  const wrapperClasses = cn("relative w-full", isSidebar ? className : undefined);
  const inputClasses = cn(
    isSidebar
      ? "h-[40px] rounded-full text-sm pl-9 pr-3 bg-transparent border-[#7752FF] text-white placeholder:text-white"
      : "h-11 rounded-[6px] text-xs pl-[16px] pr-12 border-[#540D8D33] dark:border-[#71B48D] bg-transparent backdrop-blur placeholder:dark:text-[#C5C5C5] placeholder:text-[#9366B7] max-w-[400px]",
    "focus-visible:ring-2 focus-visible:ring-ring w-full",
    !isSidebar ? className : undefined
  );

  const activeDescendant = selectedIndex >= 0 ? getOptionId(selectedIndex) : undefined;


  return (
    <div className={wrapperClasses}>
      {isSidebar && (
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FFFFFF]" aria-hidden="true" />
      )}
      <div className="relative w-full max-w-[400px]">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full relative">
                <Input
                  ref={inputRef}
                  role="combobox"
                  aria-expanded={isOpen}
                  aria-haspopup="listbox"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-activedescendant={activeDescendant}
                  aria-label={placeholder}
                  value={value}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsOpen(true)}
                  placeholder={placeholder}
                  className={inputClasses}
                />
                {!isSidebar && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-[#9366B7] dark:text-[#C5C5C5]">
                    <Kbd shortcut="search" />
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex items-center gap-2">
              <span className="text-xs">Search</span>
              <Kbd shortcut="search" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Auto-suggest Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute top-full left-0 right-0 mt-2 w-full max-w-[400px] rounded-xl border border-white/10 bg-gradient-to-b from-[#48097B] to-[#111827] p-2 shadow-2xl backdrop-blur-xl z-[100] animate-in fade-in zoom-in-95 duration-200"
        >
          {isLoading ? (
            <div role="status" aria-live="polite" className="flex items-center justify-center p-6 text-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-purple-400" aria-hidden="true" />
              <span className="ml-3 text-sm font-medium">Searching markets...</span>
            </div>
          ) : !value.trim() ? (
            /* ── EMPTY STATE SUGGESTIONS (PINNED ACTIONS + RECENTS) ── */
            <div className="flex flex-col gap-3">
              {/* Pinned Actions */}
              {pinnedActions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="px-2 pb-1 pt-1 opacity-60 text-[10px] uppercase font-bold tracking-wider text-white flex items-center gap-1.5" aria-hidden="true">
                    <PinIcon className="h-3 w-3 shrink-0" />
                    Pinned Actions
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {pinnedActions.map((action, index) => {
                      const isActive = index === selectedIndex;
                      const Icon = iconMap[action.iconName] || CircleDollarSign;

                      return (
                        <button
                          key={action.id}
                          id={getOptionId(index)}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleCommandNavigate(action.url)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg p-2.5 text-left transition-colors cursor-pointer w-full text-white",
                            isActive ? "bg-white/15" : "hover:bg-white/5"
                          )}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium">{action.label}</span>
                            <span className="text-[10px] text-white/40">Navigate to {action.url}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recently Visited Markets */}
              {recentMarkets.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
                  <div className="px-2 pb-1 pt-1 opacity-60 text-[10px] uppercase font-bold tracking-wider text-white flex items-center gap-1.5" aria-hidden="true">
                    <History className="h-3 w-3 shrink-0" />
                    Recently Visited
                  </div>
                  <div className="flex flex-col gap-1">
                    {recentMarkets.map((market, idx) => {
                      const flatIndex = pinnedActions.length + idx;
                      const isActive = flatIndex === selectedIndex;

                      return (
                        <button
                          key={`${market.id}-${idx}`}
                          id={getOptionId(flatIndex)}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleSelect(market.title, market.id)}
                          onMouseEnter={() => setSelectedIndex(flatIndex)}
                          className={cn(
                            "flex items-center justify-between rounded-lg p-2.5 text-left transition-colors cursor-pointer w-full text-white",
                            isActive ? "bg-white/15" : "hover:bg-white/5"
                          )}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 shrink-0">
                              {getCategoryIcon(market.category)}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-medium truncate">{market.title}</span>
                              <span className="text-xs text-white/50">{market.category}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-semibold text-green-400">{market.odds}% Yes</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Try Prefix Commands pill bar */}
              <div className="border-t border-white/5 pt-2 px-2 text-[11px] flex flex-wrap items-center gap-1.5 text-white/50">
                <span>Try:</span>
                <button
                  type="button"
                  onClick={() => {
                    setValue("/markets");
                    inputRef.current?.focus();
                  }}
                  className="font-mono text-[#E3D365] bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded border border-white/10 transition cursor-pointer"
                >
                  /markets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue("/claim");
                    inputRef.current?.focus();
                  }}
                  className="font-mono text-[#E3D365] bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded border border-white/10 transition cursor-pointer"
                >
                  /claim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue("/help");
                    inputRef.current?.focus();
                  }}
                  className="font-mono text-[#E3D365] bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded border border-white/10 transition cursor-pointer"
                >
                  /help
                </button>
              </div>
            </div>
          ) : filteredEvents.length > 0 ? (
            /* ── SUGGESTIONS LIST ── */
            <div className="flex flex-col gap-1">
              <div id={`${listboxId}-label`} className="px-2 pb-1 pt-1 opacity-60 text-[10px] uppercase font-bold tracking-wider text-white" aria-hidden="true">
                Suggestions
              </div>
              {filteredEvents.map((event, index) => {
                const isActive = index === selectedIndex;
                const regex = new RegExp(`(${value})`, "gi");
                const titleParts = event.title.split(regex);

                return (
                  <button
                    key={event.id}
                    id={getOptionId(index)}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(event.title, event.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex items-center justify-between rounded-lg p-3 text-left transition-colors cursor-pointer w-full text-white",
                      isActive ? "bg-white/15" : "hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 shrink-0">
                        {getCategoryIcon(event.category)}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">
                          {titleParts.map((part, i) =>
                            regex.test(part) ? (
                              <span key={i} className="text-[#E3D365] font-bold">{part}</span>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </span>
                        <span className="text-xs text-white/50">{event.category}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-xs font-semibold text-green-400">{event.odds}% Yes</span>
                      {isActive && <CornerDownLeft className="h-3 w-3 text-white/40" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── NO RESULTS ── */
            <div role="status" aria-live="polite" className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95">
              <div className="rounded-full bg-white/5 p-4 mb-3 border border-white/10">
                <SearchIcon className="h-6 w-6 text-white/40" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-white">No markets found</p>
              <p className="text-xs text-white/50 mt-1 max-w-[200px]">
                We couldn't find any markets matching <span className="text-[#E3D365]">"{value}"</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
