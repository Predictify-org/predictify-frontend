"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [value, setValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setValue("");
      // Keep focus for accessibility
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    if (event.key === "Enter") {
      onSubmit?.(value.trim());
    }
  }

  const isSidebar = variant === "sidebar";

  const wrapperClasses = cn(isSidebar ? "relative" : undefined, isSidebar ? className : undefined);

  const inputClasses = cn(
    isSidebar
      ? "h-[40px] rounded-full text-sm pl-9 pr-3 bg-transparent border-[#7752FF] text-white placeholder:text-white"
      : "h-11 rounded-[6px] text-xs pl-[16px] border-[#540D8D33] dark:border-[#71B48D] bg-transparent backdrop-blur placeholder:dark:text-[#C5C5C5] placeholder:text-[#9366B7] max-w-[400px]",
    "focus-visible:ring-2 focus-visible:ring-ring",
    !isSidebar ? className : undefined
  );

  return (
    <div className={wrapperClasses}>
      {isSidebar && (
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#FFFFFF]" />
      )}
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={placeholder}
        placeholder={placeholder}
        className={inputClasses}
      />
    </div>
  );
}


