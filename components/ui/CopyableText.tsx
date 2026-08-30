"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

/**
 * Props for the CopyableText component.
 */
interface CopyableTextProps {
  /** The full text string to be copied to the clipboard */
  text: string;
  /** Whether to truncate the middle of the string (e.g., for wallet addresses) */
  truncateMiddle?: boolean;
  /** The number of characters to show at the beginning and end when truncated */
  visibleChars?: number;
  /** Additional CSS classes for styling */
  className?: string;
}

/**
 * CopyableText
 * 
 * A reusable component that displays text (optionally truncated) with a hover-revealed copy icon.
 * Includes accessibility features like an aria-live region for screen readers and toast feedback.
 */
export function CopyableText({
  text,
  truncateMiddle = true,
  visibleChars = 4,
  className,
}: CopyableTextProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const handleCopy = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "The text has been copied to your clipboard.",
      });
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast({
        title: "Failed to copy",
        description: "Could not copy text to clipboard.",
        variant: "destructive",
      });
    }
  };

  const displayText = truncateMiddle
    ? text.length > visibleChars * 2
      ? `${text.slice(0, visibleChars)}…${text.slice(-visibleChars)}`
      : text
    : text;

  return (
    <div
      className={cn(
        "group inline-flex items-center gap-1.5 cursor-pointer rounded-md px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground",
        className
      )}
      onClick={handleCopy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCopy(e);
        }
      }}
      aria-label={`Copy ${text}`}
      title={text}
    >
      <span className="font-mono text-sm">{displayText}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-4 h-4">
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </span>
      {/* Screen reader only live region for accessibility */}
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}
