"use client";

import { useState } from "react";

export type SortOption = "newest" | "oldest" | "recipient-asc" | "recipient-desc" | "rate-asc" | "rate-desc";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  "recipient-asc": "Recipient A–Z",
  "recipient-desc": "Recipient Z–A",
  "rate-asc": "Rate low–high",
  "rate-desc": "Rate high–low",
};

type SortDropdownProps = {
  value: SortOption;
  onChange: (value: SortOption) => void;
};

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <label className="sort-dropdown">
      <span className="sr-only">Sort streams</span>
      <select
        aria-label="Sort streams"
        className="sort-dropdown__select"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
      >
        {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
