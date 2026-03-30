"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { 
  Search as SearchIcon, 
  Loader2, 
  TrendingUp, 
  Trophy, 
  Building2, 
  CircleDollarSign,
  LineChart 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEventsStore } from "@/lib/events-store";

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
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const events = useEventsStore((state) => state.events);

  // Filter events based on value
  const filteredEvents = useMemo(() => {
    if (!value.trim()) return [];
    return events.filter(e => 
      e.title.toLowerCase().includes(value.toLowerCase()) || 
      e.category.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5); // Max 5 suggestions
  }, [events, value]);

  // Handle Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
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

  // Handle typing with simulated loading
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    setSelectedIndex(-1);
    
    if (val.trim()) {
      setIsOpen(true);
      setIsLoading(true);
      // Simulate network request for wow factor
      setTimeout(() => setIsLoading(false), 300);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (title: string, marketId: string) => {
    setIsOpen(false);
    setValue(title);
    onSubmit?.(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen && value.trim()) {
      setIsOpen(true);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredEvents.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredEvents.length) {
        const selected = filteredEvents[selectedIndex];
        handleSelect(selected.title, selected.id);
      } else {
        onSubmit?.(value.trim());
        setIsOpen(false);
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category.toLowerCase()) {
      case 'football': return <Trophy className="h-4 w-4" />;
      case 'politics': return <Building2 className="h-4 w-4" />;
      case 'crypto': return <CircleDollarSign className="h-4 w-4" />;
      case 'stocks': return <LineChart className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
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

  return (
    <div className={wrapperClasses}>
      {isSidebar && (
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FFFFFF]" />
      )}
      <div className="relative w-full max-w-[400px]">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim() && setIsOpen(true)}
          aria-label={placeholder}
          placeholder={placeholder}
          className={inputClasses}
        />
        {!isSidebar && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none text-[#9366B7] dark:text-[#C5C5C5]">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[#540D8D33] dark:border-[#71B48D] bg-muted/50 px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        )}
      </div>

      {/* Auto-suggest Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 w-full max-w-[400px] rounded-xl border border-white/10 bg-gradient-to-b from-[#48097B] to-[#111827] p-2 shadow-2xl backdrop-blur-xl z-[100] animate-in fade-in zoom-in-95 duration-200"
        >
          {isLoading ? (
            <div className="flex items-center justify-center p-6 text-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              <span className="ml-3 text-sm font-medium">Searching markets...</span>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="px-2 pb-1 pt-1 opacity-60 text-[10px] uppercase font-bold tracking-wider text-white">
                Suggestions
              </div>
              {filteredEvents.map((event, index) => {
                const isActive = index === selectedIndex;
                const regex = new RegExp(`(${value})`, "gi");
                const titleParts = event.title.split(regex);
                
                return (
                  <button
                    key={event.id}
                    onClick={() => handleSelect(event.title, event.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex items-center justify-between rounded-lg p-3 text-left transition-colors cursor-pointer",
                      isActive ? "bg-white/15" : "hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 shrink-0">
                        {getCategoryIcon(event.category)}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-white truncate">
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
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-green-400">{event.odds}% Yes</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95">
              <div className="rounded-full bg-white/5 p-4 mb-3 border border-white/10">
                <SearchIcon className="h-6 w-6 text-white/40" />
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


