"use client";

/**
 * Tabs — Roving-tabindex primitive (GrantFox FWC26)
 *
 * A fully custom, headless-style tabs component that implements the
 * WAI-ARIA Tabs pattern with a *roving tabindex* strategy.
 *
 * ## Roving tabindex
 * Only the active tab trigger ever has `tabIndex={0}`. All other triggers
 * carry `tabIndex={-1}`. Arrow-key navigation moves both focus and the
 * active-tab indicator in a single keystroke, matching the ARIA authoring
 * guide for composite widgets.
 *
 * ## Why not Radix?
 * `components/ui/tabs.tsx` already wraps `@radix-ui/react-tabs`. Radix uses
 * its own internal focus-management strategy which is not exposed as roving
 * tabindex.  This primitive gives us explicit, auditable control for the
 * GrantFox campaign accessibility audit.
 *
 * ## WCAG 2.1 AA compliance
 * - 1.3.1  Info and Relationships  — roles `tablist`, `tab`, `tabpanel`
 * - 2.1.1  Keyboard               — full keyboard navigation (arrow keys,
 *                                    Home, End, Space, Enter)
 * - 2.4.3  Focus Order            — roving tabindex keeps focus inside the
 *                                    composite widget
 * - 4.1.2  Name, Role, Value      — `aria-selected`, `aria-controls`,
 *                                    `aria-labelledby`, `aria-orientation`
 *
 * @module app/components/Tabs
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single tab definition consumed by the compound component. */
export interface TabItem {
  /** Machine-readable value, must be unique within the Tabs instance. */
  value: string;
  /** Human-readable label rendered inside the tab trigger. */
  label: React.ReactNode;
  /** Content shown in the panel when this tab is active. */
  content: React.ReactNode;
  /**
   * When `true` the tab trigger is rendered but interaction is prevented.
   * Disabled tabs are skipped during arrow-key navigation.
   */
  disabled?: boolean;
}

export interface TabsProps {
  /** Array of tab definitions. */
  tabs: TabItem[];
  /**
   * Controlled active value. Omit to let the component manage state
   * internally (uncontrolled mode).
   */
  value?: string;
  /**
   * Called whenever the active tab changes.
   * @param value — the `value` of the newly selected tab
   */
  onValueChange?: (value: string) => void;
  /** Which tab is selected on first render (uncontrolled mode). */
  defaultValue?: string;
  /** Optional additional class names applied to the outer wrapper element. */
  className?: string;
  /** Class names forwarded to the `role="tablist"` element. */
  tabListClassName?: string;
  /** Class names forwarded to each `role="tab"` button. */
  tabClassName?: string;
  /** Class names forwarded to each `role="tabpanel"` section. */
  panelClassName?: string;
  /**
   * Orientation of the tab list.
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /**
   * ARIA label for the tablist.  Provide this (or `aria-labelledby`) so
   * screen-reader users can identify the widget.
   * @example "Market detail sections"
   */
  "aria-label"?: string;
  /** ID of an element whose text content labels the tablist. */
  "aria-labelledby"?: string;
}

// ---------------------------------------------------------------------------
// Internal context — keeps the compound sub-components decoupled
// ---------------------------------------------------------------------------

interface TabsContextValue {
  activeValue: string;
  activate: (value: string) => void;
  orientation: "horizontal" | "vertical";
  uid: string;
  tabs: TabItem[];
  triggerRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(
      `<${component}> must be rendered inside a <Tabs> component.`
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Tabs (root)
// ---------------------------------------------------------------------------

/**
 * Root container.  Manages active-tab state and exposes context to children.
 *
 * @example
 * ```tsx
 * <Tabs
 *   tabs={[
 *     { value: "overview", label: "Overview", content: <OverviewPanel /> },
 *     { value: "activity", label: "Activity", content: <ActivityPanel /> },
 *   ]}
 *   defaultValue="overview"
 *   aria-label="Market detail sections"
 * />
 * ```
 */
export function Tabs({
  tabs,
  value: controlledValue,
  onValueChange,
  defaultValue,
  className,
  tabListClassName,
  tabClassName,
  panelClassName,
  orientation = "horizontal",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: TabsProps) {
  // Derive the initial value: controlled > defaultValue > first enabled tab
  const firstEnabled = tabs.find((t) => !t.disabled)?.value ?? tabs[0]?.value;
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue ?? firstEnabled ?? ""
  );

  const activeValue =
    controlledValue !== undefined ? controlledValue : internalValue;

  const activate = useCallback(
    (val: string) => {
      if (controlledValue === undefined) {
        setInternalValue(val);
      }
      onValueChange?.(val);
    },
    [controlledValue, onValueChange]
  );

  // Stable uid prefix so id attributes are unique even with multiple Tabs on page
  const uid = useId().replace(/:/g, "");

  // Refs to each trigger button — used for programmatic focus
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  return (
    <TabsContext.Provider
      value={{ activeValue, activate, orientation, uid, tabs, triggerRefs }}
    >
      <div
        className={cn("flex flex-col gap-0", className)}
        data-orientation={orientation}
      >
        <TabList
          className={tabListClassName}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              className={tabClassName}
            >
              {tab.label}
            </Tab>
          ))}
        </TabList>

        {tabs.map((tab) => (
          <TabPanel key={tab.value} value={tab.value} className={panelClassName}>
            {tab.content}
          </TabPanel>
        ))}
      </div>
    </TabsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// TabList
// ---------------------------------------------------------------------------

interface TabListProps {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/**
 * The `role="tablist"` container.  Handles arrow-key / Home / End navigation
 * using the roving tabindex pattern: exactly one trigger has `tabIndex={0}`;
 * the rest carry `tabIndex={-1}`.
 */
function TabList({
  children,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: TabListProps) {
  const { orientation, tabs, activate, triggerRefs } = useTabsContext("TabList");

  /**
   * Handle keyboard navigation across triggers.
   *
   * Horizontal tabs: ArrowLeft / ArrowRight
   * Vertical tabs:   ArrowUp / ArrowDown
   * Both:            Home / End / Enter / Space
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      if (enabledTabs.length === 0) return;

      // Detect which enabled tab is currently focused
      const focusedEl = document.activeElement as HTMLButtonElement | null;
      const currentIdx = enabledTabs.findIndex(
        (t) => triggerRefs.current.get(t.value) === focusedEl
      );

      const isHorizontal = orientation === "horizontal";
      const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";
      const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";

      let targetIdx: number | null = null;

      switch (e.key) {
        case nextKey:
          targetIdx = (currentIdx + 1) % enabledTabs.length;
          break;
        case prevKey:
          targetIdx =
            (currentIdx - 1 + enabledTabs.length) % enabledTabs.length;
          break;
        case "Home":
          targetIdx = 0;
          break;
        case "End":
          targetIdx = enabledTabs.length - 1;
          break;
        // Enter / Space activate already handled by the button's onClick; no action needed here.
        default:
          return;
      }

      if (targetIdx !== null) {
        e.preventDefault();
        const target = enabledTabs[targetIdx];
        // Move focus
        triggerRefs.current.get(target.value)?.focus();
        // Activate on focus (follows the ARIA "select-follows-focus" recommendation)
        activate(target.value);
      }
    },
    [tabs, orientation, activate, triggerRefs]
  );

  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      onKeyDown={handleKeyDown}
      className={cn(
        // Base layout
        "flex gap-1 overflow-x-auto",
        // Scrollbar hidden on mobile for clean look
        "scrollbar-hide",
        // Bottom border that the active-tab indicator sits on
        "border-b border-border",
        // Vertical layout variant
        orientation === "vertical" && "flex-col border-b-0 border-r",
        className
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab (trigger)
// ---------------------------------------------------------------------------

interface TabProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * A single `role="tab"` trigger button.
 *
 * Roving tabindex:
 * - Active tab → `tabIndex={0}` (reachable via Tab key)
 * - Inactive tabs → `tabIndex={-1}` (reachable only via arrow keys)
 */
function Tab({ value, children, disabled, className }: TabProps) {
  const { activeValue, activate, uid, triggerRefs } = useTabsContext("Tab");
  const isSelected = activeValue === value;

  // Register / unregister this trigger's ref in the shared map
  const refCallback = useCallback(
    (el: HTMLButtonElement | null) => {
      if (el) {
        triggerRefs.current.set(value, el);
      } else {
        triggerRefs.current.delete(value);
      }
    },
    [value, triggerRefs]
  );

  return (
    <button
      ref={refCallback}
      role="tab"
      id={`${uid}-tab-${value}`}
      aria-selected={isSelected}
      aria-controls={`${uid}-panel-${value}`}
      aria-disabled={disabled}
      disabled={disabled}
      // Roving tabindex: only the active tab is in the natural tab order
      tabIndex={isSelected ? 0 : -1}
      onClick={() => !disabled && activate(value)}
      className={cn(
        // Base
        "relative flex items-center justify-center gap-2",
        "whitespace-nowrap px-4 py-2.5",
        "text-sm font-medium",
        "rounded-t-md",
        // Transition
        "transition-colors duration-150",
        // Default (inactive) colours — use design tokens
        "text-muted-foreground",
        "hover:text-foreground hover:bg-accent",
        // Active state
        isSelected && [
          "text-foreground",
          // Bottom-border indicator: 2px solid, uses --primary token
          "after:absolute after:bottom-[-1px] after:left-0 after:right-0",
          "after:h-[2px] after:rounded-full after:bg-primary after:content-['']",
        ],
        // Disabled state
        disabled && "pointer-events-none opacity-40",
        // Focus-visible ring — relies on global focus.css layer;
        // explicit classes here so they appear in component-level overrides too.
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// TabPanel
// ---------------------------------------------------------------------------

interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * A `role="tabpanel"` container.
 *
 * Hidden panels use `hidden` rather than conditional rendering so that
 * React subtrees (forms, charts, etc.) are preserved in the DOM and don't
 * remount on tab switch — a common UX footgun.
 *
 * Screen readers: `tabIndex={0}` on the panel means keyboard users can Tab
 * from the active trigger directly into panel content.
 */
function TabPanel({ value, children, className }: TabPanelProps) {
  const { activeValue, uid } = useTabsContext("TabPanel");
  const isActive = activeValue === value;

  return (
    <div
      role="tabpanel"
      id={`${uid}-panel-${value}`}
      aria-labelledby={`${uid}-tab-${value}`}
      // tabIndex={0} allows keyboard users to Tab from the trigger into the panel
      tabIndex={0}
      hidden={!isActive}
      className={cn(
        // Remove default focus ring on the panel wrapper — content inside
        // will have their own focus styles via the global focus.css layer.
        "outline-none",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "pt-4",
        className
      )}
    >
      {children}
    </div>
  );
}
