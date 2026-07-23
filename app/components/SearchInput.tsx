/**
 * SearchInput
 *
 * An accessible search input that follows the ARIA combobox pattern (WAI-ARIA
 * 1.2 §5.9).  Users can navigate suggestions with the arrow keys, select with
 * Enter, and dismiss the listbox with Escape.
 *
 * Accessibility features
 * ──────────────────────
 * • Input carries role="combobox" with aria-expanded, aria-haspopup="listbox",
 *   aria-autocomplete="list", and aria-controls pointing at the listbox.
 * • aria-activedescendant tracks the keyboard-highlighted option.
 * • Each option has role="option" and aria-selected.
 * • The listbox label ("Search suggestions") is announced when it appears.
 * • A live region announces result counts so screen-reader users know when
 *   the list has changed.
 * • The clear button is keyboard-reachable and has a descriptive aria-label.
 * • Reduced-motion: the dropdown entrance animation respects
 *   `prefers-reduced-motion: reduce`.
 *
 * Keyboard interaction
 * ────────────────────
 * ArrowDown   Move visual focus to the next option (wraps at end)
 * ArrowUp     Move visual focus to the previous option (wraps at start)
 * Home        Move to the first option
 * End         Move to the last option
 * Enter       Confirm the highlighted option (or submit raw query if none)
 * Escape      Close the listbox and return focus to the input
 * Tab         Close the listbox (natural focus movement)
 */

"use client";

import React, {
  useState,
  useRef,
  useId,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { Search as SearchIcon, X as ClearIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single suggestion item displayed in the listbox. */
export interface SearchSuggestion {
  /** Unique identifier for the item. */
  id: string;
  /** Primary label shown to the user. */
  label: string;
  /** Optional sub-label shown in a smaller font beneath the label. */
  sublabel?: string;
  /** Optional accessible icon rendered before the label (must carry aria-hidden). */
  icon?: React.ReactNode;
}

export interface SearchInputProps {
  /** Current value of the input (controlled). */
  value?: string;
  /** Called when the user changes the input value. */
  onChange?: (value: string) => void;
  /**
   * Suggestions to display in the listbox.  The consumer is responsible for
   * filtering / sorting; SearchInput renders whatever is provided.
   */
  suggestions?: SearchSuggestion[];
  /**
   * Called when the user confirms a suggestion (Enter key or click).
   * Receives the confirmed suggestion object.
   */
  onSelect?: (suggestion: SearchSuggestion) => void;
  /**
   * Called when the user submits a free-text query (Enter with no suggestion
   * highlighted, or Enter when suggestions is empty).
   */
  onSubmit?: (query: string) => void;
  /** Called when the listbox opens. */
  onOpen?: () => void;
  /** Called when the listbox closes. */
  onClose?: () => void;
  /** Show a spinner inside the input to indicate loading. */
  isLoading?: boolean;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Additional class names for the outermost wrapper. */
  className?: string;
  /**
   * Maximum number of suggestions to show.  Remaining items are hidden.
   * @default 10
   */
  maxSuggestions?: number;
  /** Whether the input should be disabled. */
  disabled?: boolean;
  /** id forwarded to the underlying <input>. Useful for <label htmlFor>. */
  id?: string;
  /** aria-label for the underlying <input>. */
  "aria-label"?: string;
  /** aria-labelledby for the underlying <input>. */
  "aria-labelledby"?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Accessible search input with a combobox dropdown.
 *
 * @example
 * ```tsx
 * <SearchInput
 *   value={query}
 *   onChange={setQuery}
 *   suggestions={filteredMarkets}
 *   onSelect={(s) => router.push(`/events/${s.id}`)}
 *   onSubmit={(q) => router.push(`/events?q=${q}`)}
 *   placeholder="Search markets…"
 * />
 * ```
 */
export function SearchInput({
  value: valueProp,
  onChange,
  suggestions = [],
  onSelect,
  onSubmit,
  onOpen,
  onClose,
  isLoading = false,
  placeholder = "Search…",
  className,
  maxSuggestions = 10,
  disabled = false,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SearchInputProps) {
  // ── Uncontrolled internal value when no `value` prop is supplied ──────────
  const [internalValue, setInternalValue] = useState("");
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : internalValue;

  // ── Dropdown / selection state ─────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Stable IDs for ARIA wiring ─────────────────────────────────────────────
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const liveId = `${uid}-live`;
  const getOptionId = useCallback(
    (index: number) => `${uid}-option-${index}`,
    [uid],
  );

  // ── Visible suggestions (capped) ──────────────────────────────────────────
  const visibleSuggestions = useMemo(
    () => suggestions.slice(0, maxSuggestions),
    [suggestions, maxSuggestions],
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    onClose?.();
  }, [onClose]);

  const commitValue = useCallback(
    (newValue: string) => {
      if (!isControlled) setInternalValue(newValue);
      onChange?.(newValue);
    },
    [isControlled, onChange],
  );

  const handleClear = useCallback(() => {
    commitValue("");
    closeDropdown();
    inputRef.current?.focus();
  }, [commitValue, closeDropdown]);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closeDropdown]);

  // ── Scroll active option into view ────────────────────────────────────────
  useEffect(() => {
    if (activeIndex < 0 || !listboxRef.current) return;
    const option = listboxRef.current.querySelector<HTMLLIElement>(
      `[id="${getOptionId(activeIndex)}"]`,
    );
    option?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, getOptionId]);

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    commitValue(newVal);
    setActiveIndex(-1);
    if (newVal.trim() || visibleSuggestions.length > 0) {
      openDropdown();
    } else {
      closeDropdown();
    }
  };

  const handleFocus = () => {
    if (visibleSuggestions.length > 0 || value.trim()) {
      openDropdown();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const last = visibleSuggestions.length - 1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          openDropdown();
        }
        setActiveIndex((prev) => (prev < last ? prev + 1 : 0));
        break;

      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) {
          openDropdown();
        }
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : last));
        break;

      case "Home":
        if (isOpen && visibleSuggestions.length > 0) {
          e.preventDefault();
          setActiveIndex(0);
        }
        break;

      case "End":
        if (isOpen && visibleSuggestions.length > 0) {
          e.preventDefault();
          setActiveIndex(last);
        }
        break;

      case "Enter":
        e.preventDefault();
        if (isOpen && activeIndex >= 0 && activeIndex <= last) {
          const selected = visibleSuggestions[activeIndex];
          onSelect?.(selected);
          commitValue(selected.label);
          closeDropdown();
        } else {
          const trimmed = value.trim();
          if (trimmed) {
            onSubmit?.(trimmed);
            closeDropdown();
          }
        }
        break;

      case "Escape":
        e.preventDefault();
        if (isOpen) {
          closeDropdown();
        } else {
          commitValue("");
        }
        inputRef.current?.focus();
        break;

      case "Tab":
        // Let Tab close the dropdown naturally without preventing default so
        // focus can move to the next element in the page.
        closeDropdown();
        break;
    }
  };

  const handleOptionClick = (suggestion: SearchSuggestion) => {
    onSelect?.(suggestion);
    commitValue(suggestion.label);
    closeDropdown();
    inputRef.current?.focus();
  };

  const handleOptionPointerEnter = (index: number) => {
    setActiveIndex(index);
  };

  // ── Derived values for ARIA ────────────────────────────────────────────────
  const activeDescendant =
    isOpen && activeIndex >= 0 ? getOptionId(activeIndex) : undefined;

  const liveMessage = (() => {
    if (!isOpen) return "";
    if (isLoading) return "Searching…";
    if (visibleSuggestions.length === 0 && value.trim())
      return "No results found.";
    if (visibleSuggestions.length > 0)
      return `${visibleSuggestions.length} suggestion${visibleSuggestions.length !== 1 ? "s" : ""} available. Use arrow keys to navigate.`;
    return "";
  })();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {/* ── Screen-reader live region ── */}
      <div
        id={liveId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveMessage}
      </div>

      {/* ── Input wrapper ── */}
      <div className="relative flex items-center">
        {/* Leading search icon */}
        <SearchIcon
          className="pointer-events-none absolute left-3 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-label={ariaLabel ?? (!ariaLabelledBy ? placeholder : undefined)}
          aria-labelledby={ariaLabelledBy}
          aria-busy={isLoading}
          aria-disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-9 text-sm",
            "text-foreground placeholder:text-muted-foreground",
            "ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isLoading && "pr-16",
          )}
        />

        {/* Trailing: spinner or clear button */}
        <div className="absolute right-3 flex items-center gap-1">
          {isLoading ? (
            <Loader2
              className="h-4 w-4 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              tabIndex={0}
              className={cn(
                "rounded-sm text-muted-foreground",
                "hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "transition-colors",
              )}
            >
              <ClearIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Listbox dropdown ── */}
      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className={cn(
            "absolute top-full z-50 mt-1 max-h-64 w-full overflow-y-auto overscroll-contain",
            "rounded-md border border-border bg-popover shadow-md",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95",
            "focus:outline-none",
          )}
        >
          {isLoading ? (
            <li
              role="option"
              aria-selected="false"
              aria-disabled="true"
              className="flex cursor-default items-center gap-2 px-3 py-3 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Searching…
            </li>
          ) : visibleSuggestions.length === 0 ? (
            <li
              role="option"
              aria-selected="false"
              aria-disabled="true"
              className="cursor-default px-3 py-3 text-sm text-muted-foreground"
            >
              No results found.
            </li>
          ) : (
            visibleSuggestions.map((suggestion, index) => {
              const isActive = index === activeIndex;

              return (
                <li
                  key={suggestion.id}
                  id={getOptionId(index)}
                  role="option"
                  aria-selected={isActive}
                  onPointerEnter={() => handleOptionPointerEnter(index)}
                  onClick={() => handleOptionClick(suggestion)}
                  className={cn(
                    "flex cursor-pointer select-none items-center gap-2.5 px-3 py-2.5 text-sm",
                    "text-popover-foreground outline-none transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/60",
                  )}
                >
                  {suggestion.icon && (
                    <span className="shrink-0" aria-hidden="true">
                      {suggestion.icon}
                    </span>
                  )}
                  <span className="flex flex-col overflow-hidden">
                    <span className="truncate font-medium">
                      {suggestion.label}
                    </span>
                    {suggestion.sublabel && (
                      <span className="truncate text-xs text-muted-foreground">
                        {suggestion.sublabel}
                      </span>
                    )}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
