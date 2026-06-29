"use client";

import { useState } from "react";

interface CopyAddressProps {
  /** The address or hash to copy */
  value: string;
  /** Number of characters to show at start and end when truncating (default: 6) */
  truncateChars?: number;
  /** Optional custom class name for the wrapper */
  className?: string;
  /** Whether to show the copy button (default: true) */
  showCopyButton?: boolean;
  /** Whether to hide the truncated version and show full address (for print) */
  printOnly?: boolean;
}

/**
 * Truncates an address/hash by showing first N and last N characters
 */
function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * CopyButton - Internal component for the copy button with success state
 */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      aria-label="Copy to clipboard"
      className="receipt-copy-btn no-print"
      onClick={handleCopy}
      type="button"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * CopyAddress - Reusable component for displaying addresses/hashes with inline copy button
 * 
 * Features:
 * - Automatic address truncation for screen display
 * - Full address shown in print mode
 * - Inline copy button with success state
 * - Accessible with proper ARIA labels
 * - WCAG 2.1 AA compliant
 * 
 * @example
 * <CopyAddress value="GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3JKAKZK7G" />
 * 
 * @example
 * <CopyAddress 
 *   value="abc123def456" 
 *   truncateChars={4}
 *   showCopyButton={false}
 * />
 */
export function CopyAddress({
  value,
  truncateChars = 6,
  className = "",
  showCopyButton = true,
  printOnly = false,
}: CopyAddressProps) {
  if (printOnly) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={`receipt-address-wrap ${className}`}>
      <span aria-hidden="true" className="no-print">
        {truncateAddress(value, truncateChars)}
      </span>
      <span className="print-only">{value}</span>
      {showCopyButton && <CopyButton value={value} />}
    </span>
  );
}
