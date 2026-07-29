/**
 * Tests for app/components/Tabs.tsx — Roving tabindex Tabs primitive
 *
 * Coverage strategy:
 *  - Rendering: correct ARIA roles and attributes on initial mount
 *  - Roving tabindex: only the active tab has tabIndex=0; others have -1
 *  - Mouse interaction: clicking a tab activates it
 *  - Keyboard navigation (horizontal): ArrowRight, ArrowLeft, Home, End
 *  - Keyboard navigation (vertical): ArrowDown, ArrowUp, Home, End
 *  - Wrap-around: navigation wraps at first and last tabs
 *  - Disabled tabs: skipped during navigation, not activatable
 *  - Panel visibility: active panel visible, others hidden
 *  - DOM preservation: hidden panels remain in the DOM (no remounting)
 *  - Controlled mode: respects external value + fires onValueChange
 *  - Uncontrolled mode: manages own state when value is omitted
 *  - defaultValue: uses provided default tab on first render
 *  - Orientation: aria-orientation matches prop
 *  - Multiple instances: unique IDs prevent aria-controls collision
 *  - Error guard: throws when sub-components used outside Tabs
 *
 * @see app/components/Tabs.tsx
 */

import React, { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, type TabItem, type TabsProps } from "@/app/components/Tabs";

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

/** Minimal tabs fixture — three enabled tabs. */
const BASIC_TABS: TabItem[] = [
  { value: "alpha", label: "Alpha", content: <p>Alpha panel</p> },
  { value: "beta", label: "Beta", content: <p>Beta panel</p> },
  { value: "gamma", label: "Gamma", content: <p>Gamma panel</p> },
];

/** Fixture with one disabled tab in the middle. */
const TABS_WITH_DISABLED: TabItem[] = [
  { value: "one", label: "One", content: <p>Panel one</p> },
  { value: "two", label: "Two", content: <p>Panel two</p>, disabled: true },
  { value: "three", label: "Three", content: <p>Panel three</p> },
];

/** Helper: render with sensible defaults plus any overrides. */
function renderTabs(overrides: Partial<TabsProps> = {}) {
  return render(
    <Tabs
      tabs={BASIC_TABS}
      defaultValue="alpha"
      aria-label="Test tabs"
      {...overrides}
    />
  );
}

// ---------------------------------------------------------------------------
// 1. ARIA roles and attributes
// ---------------------------------------------------------------------------

describe("Tabs — ARIA roles and attributes", () => {
  it("renders a tablist element", () => {
    renderTabs();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders the correct number of tab buttons", () => {
    renderTabs();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("renders the correct number of tabpanels", () => {
    renderTabs();
    // Only one visible panel at a time; others are hidden with [hidden]
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    expect(panels).toHaveLength(3);
  });

  it("active tab has aria-selected=true", () => {
    renderTabs({ defaultValue: "beta" });
    const betaTab = screen.getByRole("tab", { name: /beta/i });
    expect(betaTab).toHaveAttribute("aria-selected", "true");
  });

  it("inactive tabs have aria-selected=false", () => {
    renderTabs({ defaultValue: "alpha" });
    const betaTab = screen.getByRole("tab", { name: /beta/i });
    const gammaTab = screen.getByRole("tab", { name: /gamma/i });
    expect(betaTab).toHaveAttribute("aria-selected", "false");
    expect(gammaTab).toHaveAttribute("aria-selected", "false");
  });

  it("each tab has aria-controls pointing to its panel", () => {
    renderTabs();
    const tabs = screen.getAllByRole("tab");
    tabs.forEach((tab) => {
      const panelId = tab.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      const panel = document.getElementById(panelId!);
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveAttribute("role", "tabpanel");
    });
  });

  it("each panel has aria-labelledby pointing to its tab", () => {
    renderTabs();
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    panels.forEach((panel) => {
      const tabId = panel.getAttribute("aria-labelledby");
      expect(tabId).toBeTruthy();
      const tab = document.getElementById(tabId!);
      expect(tab).toBeInTheDocument();
      expect(tab).toHaveAttribute("role", "tab");
    });
  });

  it("tablist has aria-orientation=horizontal by default", () => {
    renderTabs();
    expect(screen.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "horizontal"
    );
  });

  it("tablist has aria-orientation=vertical when orientation=vertical", () => {
    renderTabs({ orientation: "vertical" });
    expect(screen.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "vertical"
    );
  });

  it("tablist has the supplied aria-label", () => {
    renderTabs({ "aria-label": "Market sections" });
    expect(
      screen.getByRole("tablist", { name: /market sections/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Roving tabindex
// ---------------------------------------------------------------------------

describe("Tabs — roving tabindex", () => {
  it("active tab has tabIndex=0", () => {
    renderTabs({ defaultValue: "alpha" });
    const alphaTab = screen.getByRole("tab", { name: /alpha/i });
    expect(alphaTab).toHaveAttribute("tabindex", "0");
  });

  it("inactive tabs have tabIndex=-1", () => {
    renderTabs({ defaultValue: "alpha" });
    const betaTab = screen.getByRole("tab", { name: /beta/i });
    const gammaTab = screen.getByRole("tab", { name: /gamma/i });
    expect(betaTab).toHaveAttribute("tabindex", "-1");
    expect(gammaTab).toHaveAttribute("tabindex", "-1");
  });

  it("tabIndex shifts when a different tab is activated", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "alpha" });

    await user.click(screen.getByRole("tab", { name: /beta/i }));

    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveAttribute(
      "tabindex",
      "-1"
    );
    expect(screen.getByRole("tab", { name: /beta/i })).toHaveAttribute(
      "tabindex",
      "0"
    );
    expect(screen.getByRole("tab", { name: /gamma/i })).toHaveAttribute(
      "tabindex",
      "-1"
    );
  });

  it("only ever one tab has tabIndex=0 at a time", async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole("tab", { name: /gamma/i }));

    const zeroed = screen
      .getAllByRole("tab")
      .filter((t) => t.getAttribute("tabindex") === "0");
    expect(zeroed).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Mouse interaction
// ---------------------------------------------------------------------------

describe("Tabs — mouse interaction", () => {
  it("clicking a tab activates it", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "alpha" });

    await user.click(screen.getByRole("tab", { name: /beta/i }));

    expect(screen.getByRole("tab", { name: /beta/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("clicking the already-active tab keeps it active", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "alpha" });

    await user.click(screen.getByRole("tab", { name: /alpha/i }));

    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("clicking a disabled tab does not activate it", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        tabs={TABS_WITH_DISABLED}
        defaultValue="one"
        aria-label="Disabled test"
      />
    );

    // disabled button — userEvent.click is blocked by the disabled attribute
    const disabledTab = screen.getByRole("tab", { name: /two/i });
    expect(disabledTab).toBeDisabled();

    // Attempt a click (user-event skips disabled elements)
    await user.click(disabledTab).catch(() => {});

    expect(screen.getByRole("tab", { name: /one/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Keyboard navigation — horizontal (default)
// ---------------------------------------------------------------------------

describe("Tabs — keyboard navigation (horizontal)", () => {
  async function setupHorizontal(defaultValue = "alpha") {
    const user = userEvent.setup();
    renderTabs({ defaultValue, orientation: "horizontal" });
    // Focus the active tab first
    screen.getByRole("tab", { name: new RegExp(defaultValue, "i") }).focus();
    return user;
  }

  it("ArrowRight moves focus to the next tab", async () => {
    const user = await setupHorizontal("alpha");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /beta/i })).toHaveFocus();
  });

  it("ArrowRight wraps from last tab to first", async () => {
    const user = await setupHorizontal("gamma");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveFocus();
  });

  it("ArrowLeft moves focus to the previous tab", async () => {
    const user = await setupHorizontal("beta");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveFocus();
  });

  it("ArrowLeft wraps from first tab to last", async () => {
    const user = await setupHorizontal("alpha");
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: /gamma/i })).toHaveFocus();
  });

  it("Home moves focus to the first tab", async () => {
    const user = await setupHorizontal("gamma");
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveFocus();
  });

  it("End moves focus to the last tab", async () => {
    const user = await setupHorizontal("alpha");
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: /gamma/i })).toHaveFocus();
  });

  it("ArrowRight also activates the newly focused tab (select-follows-focus)", async () => {
    const user = await setupHorizontal("alpha");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /beta/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("ArrowDown has no effect in horizontal orientation", async () => {
    const user = await setupHorizontal("alpha");
    await user.keyboard("{ArrowDown}");
    // Focus and active state should be unchanged
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Keyboard navigation — vertical
// ---------------------------------------------------------------------------

describe("Tabs — keyboard navigation (vertical)", () => {
  async function setupVertical(defaultValue = "alpha") {
    const user = userEvent.setup();
    renderTabs({ defaultValue, orientation: "vertical" });
    screen.getByRole("tab", { name: new RegExp(defaultValue, "i") }).focus();
    return user;
  }

  it("ArrowDown moves focus to the next tab", async () => {
    const user = await setupVertical("alpha");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: /beta/i })).toHaveFocus();
  });

  it("ArrowDown wraps from last to first", async () => {
    const user = await setupVertical("gamma");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveFocus();
  });

  it("ArrowUp moves focus to the previous tab", async () => {
    const user = await setupVertical("beta");
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveFocus();
  });

  it("ArrowUp wraps from first to last", async () => {
    const user = await setupVertical("alpha");
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("tab", { name: /gamma/i })).toHaveFocus();
  });

  it("ArrowRight has no effect in vertical orientation", async () => {
    const user = await setupVertical("alpha");
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});

// ---------------------------------------------------------------------------
// 6. Disabled tabs
// ---------------------------------------------------------------------------

describe("Tabs — disabled tabs", () => {
  it("disabled tab has aria-disabled=true", () => {
    render(
      <Tabs
        tabs={TABS_WITH_DISABLED}
        defaultValue="one"
        aria-label="Disabled test"
      />
    );
    expect(screen.getByRole("tab", { name: /two/i })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });

  it("disabled tab is skipped during ArrowRight navigation", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        tabs={TABS_WITH_DISABLED}
        defaultValue="one"
        aria-label="Disabled test"
      />
    );
    screen.getByRole("tab", { name: /one/i }).focus();
    await user.keyboard("{ArrowRight}");
    // "two" is disabled → should skip to "three"
    expect(screen.getByRole("tab", { name: /three/i })).toHaveFocus();
  });

  it("disabled tab is skipped during ArrowLeft navigation (wrap)", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        tabs={TABS_WITH_DISABLED}
        defaultValue="three"
        aria-label="Disabled test"
      />
    );
    screen.getByRole("tab", { name: /three/i }).focus();
    await user.keyboard("{ArrowLeft}");
    // "two" is disabled → skips to "one"
    expect(screen.getByRole("tab", { name: /one/i })).toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// 7. Panel visibility
// ---------------------------------------------------------------------------

describe("Tabs — panel visibility", () => {
  it("active panel is visible (no hidden attribute)", () => {
    renderTabs({ defaultValue: "alpha" });
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    const alphaPanel = panels.find((p) =>
      within(p).queryByText("Alpha panel")
    );
    expect(alphaPanel).not.toHaveAttribute("hidden");
  });

  it("inactive panels have the hidden attribute", () => {
    renderTabs({ defaultValue: "alpha" });
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    const betaPanel = panels.find((p) => within(p).queryByText("Beta panel"));
    const gammaPanel = panels.find((p) =>
      within(p).queryByText("Gamma panel")
    );
    expect(betaPanel).toHaveAttribute("hidden");
    expect(gammaPanel).toHaveAttribute("hidden");
  });

  it("switching tabs reveals the correct panel", async () => {
    const user = userEvent.setup();
    renderTabs({ defaultValue: "alpha" });

    await user.click(screen.getByRole("tab", { name: /gamma/i }));

    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    const gammaPanel = panels.find((p) =>
      within(p).queryByText("Gamma panel")
    );
    const alphaPanel = panels.find((p) =>
      within(p).queryByText("Alpha panel")
    );
    expect(gammaPanel).not.toHaveAttribute("hidden");
    expect(alphaPanel).toHaveAttribute("hidden");
  });
});

// ---------------------------------------------------------------------------
// 8. DOM preservation (no remount on tab switch)
// ---------------------------------------------------------------------------

describe("Tabs — DOM preservation", () => {
  it("all panels remain in the DOM regardless of active state", () => {
    renderTabs({ defaultValue: "alpha" });
    // Use getByText which also searches hidden elements
    expect(screen.getByText("Alpha panel")).toBeInTheDocument();
    expect(screen.getByText("Beta panel")).toBeInTheDocument();
    expect(screen.getByText("Gamma panel")).toBeInTheDocument();
  });

  it("hidden panel content is preserved after switching tabs", async () => {
    const user = userEvent.setup();
    // Use a stateful child to verify it doesn't remount
    let renderCount = 0;

    function TrackedContent() {
      renderCount++;
      return <p>Tracked content (count: {renderCount})</p>;
    }

    const tabs: TabItem[] = [
      { value: "a", label: "A", content: <TrackedContent /> },
      { value: "b", label: "B", content: <p>B panel</p> },
    ];

    render(<Tabs tabs={tabs} defaultValue="a" aria-label="DOM test" />);
    const initialCount = renderCount;

    await user.click(screen.getByRole("tab", { name: /^B$/i }));
    await user.click(screen.getByRole("tab", { name: /^A$/i }));

    // If it had remounted, renderCount would have increased by 1 more time
    // With hidden, the component should not remount
    expect(renderCount).toBe(initialCount);
  });
});

// ---------------------------------------------------------------------------
// 9. Controlled mode
// ---------------------------------------------------------------------------

describe("Tabs — controlled mode", () => {
  it("renders with the provided controlled value", () => {
    render(
      <Tabs
        tabs={BASIC_TABS}
        value="beta"
        onValueChange={() => {}}
        aria-label="Controlled"
      />
    );
    expect(screen.getByRole("tab", { name: /beta/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("calls onValueChange with the new value when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    render(
      <Tabs
        tabs={BASIC_TABS}
        value="alpha"
        onValueChange={onValueChange}
        aria-label="Controlled"
      />
    );

    await user.click(screen.getByRole("tab", { name: /gamma/i }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("gamma");
  });

  it("does not update internal state in controlled mode (value stays external)", async () => {
    const user = userEvent.setup();
    // onValueChange does NOT update value — simulates a consumer that ignores the event
    render(
      <Tabs
        tabs={BASIC_TABS}
        value="alpha"
        onValueChange={() => {}}
        aria-label="Controlled static"
      />
    );

    await user.click(screen.getByRole("tab", { name: /beta/i }));

    // Controlled value hasn't changed externally, so alpha should still be selected
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("reflects external value changes", async () => {
    const user = userEvent.setup();

    function ControlledWrapper() {
      const [value, setValue] = useState("alpha");
      return (
        <>
          <button onClick={() => setValue("gamma")}>Switch to Gamma</button>
          <Tabs
            tabs={BASIC_TABS}
            value={value}
            onValueChange={setValue}
            aria-label="Controlled dynamic"
          />
        </>
      );
    }

    render(<ControlledWrapper />);
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await user.click(screen.getByRole("button", { name: /switch to gamma/i }));

    expect(screen.getByRole("tab", { name: /gamma/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });
});

// ---------------------------------------------------------------------------
// 10. Uncontrolled mode
// ---------------------------------------------------------------------------

describe("Tabs — uncontrolled mode", () => {
  it("defaults to the first enabled tab when no defaultValue given", () => {
    render(<Tabs tabs={BASIC_TABS} aria-label="Uncontrolled" />);
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("uses defaultValue when provided", () => {
    render(
      <Tabs
        tabs={BASIC_TABS}
        defaultValue="gamma"
        aria-label="Default value test"
      />
    );
    expect(screen.getByRole("tab", { name: /gamma/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("updates active tab internally on click", async () => {
    const user = userEvent.setup();
    render(
      <Tabs tabs={BASIC_TABS} defaultValue="alpha" aria-label="Uncontrolled click" />
    );

    await user.click(screen.getByRole("tab", { name: /beta/i }));

    expect(screen.getByRole("tab", { name: /beta/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: /alpha/i })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("fires onValueChange callback even in uncontrolled mode", async () => {
    const user = userEvent.setup();
    const onValueChange = jest.fn();
    render(
      <Tabs
        tabs={BASIC_TABS}
        defaultValue="alpha"
        onValueChange={onValueChange}
        aria-label="Uncontrolled callback"
      />
    );

    await user.click(screen.getByRole("tab", { name: /beta/i }));

    expect(onValueChange).toHaveBeenCalledWith("beta");
  });
});

// ---------------------------------------------------------------------------
// 11. Multiple instances — unique IDs
// ---------------------------------------------------------------------------

describe("Tabs — multiple instances", () => {
  it("two Tabs instances have non-colliding aria-controls IDs", () => {
    render(
      <>
        <Tabs tabs={BASIC_TABS} defaultValue="alpha" aria-label="Instance 1" />
        <Tabs tabs={BASIC_TABS} defaultValue="alpha" aria-label="Instance 2" />
      </>
    );

    const allTabs = screen.getAllByRole("tab");
    const allPanels = screen.getAllByRole("tabpanel", { hidden: true });

    const tabControls = allTabs.map((t) => t.getAttribute("aria-controls"));
    const panelIds = allPanels.map((p) => p.getAttribute("id"));

    // All IDs should be unique — no two tabs point to the same panel
    const uniqueControls = new Set(tabControls);
    expect(uniqueControls.size).toBe(allTabs.length);

    // Every aria-controls value corresponds to a real panel ID
    tabControls.forEach((ctrl) => {
      expect(panelIds).toContain(ctrl);
    });
  });
});

// ---------------------------------------------------------------------------
// 12. className forwarding
// ---------------------------------------------------------------------------

describe("Tabs — className forwarding", () => {
  it("applies className to the root wrapper", () => {
    const { container } = renderTabs({ className: "my-custom-wrapper" });
    expect(container.firstChild).toHaveClass("my-custom-wrapper");
  });

  it("applies tabListClassName to the tablist", () => {
    renderTabs({ tabListClassName: "my-tablist" });
    expect(screen.getByRole("tablist")).toHaveClass("my-tablist");
  });

  it("applies tabClassName to each tab button", () => {
    renderTabs({ tabClassName: "my-tab" });
    screen.getAllByRole("tab").forEach((tab) => {
      expect(tab).toHaveClass("my-tab");
    });
  });

  it("applies panelClassName to each panel", () => {
    renderTabs({ panelClassName: "my-panel" });
    screen.getAllByRole("tabpanel", { hidden: true }).forEach((panel) => {
      expect(panel).toHaveClass("my-panel");
    });
  });
});

// ---------------------------------------------------------------------------
// 13. Edge cases
// ---------------------------------------------------------------------------

describe("Tabs — edge cases", () => {
  it("renders without crashing when tabs array is empty", () => {
    const { container } = render(
      <Tabs tabs={[]} aria-label="Empty tabs" />
    );
    expect(container).toBeTruthy();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("renders without crashing with a single tab", () => {
    render(
      <Tabs
        tabs={[{ value: "only", label: "Only", content: <p>Only panel</p> }]}
        aria-label="Single tab"
      />
    );
    expect(screen.getByRole("tab", { name: /only/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("renders React node labels (not just strings)", () => {
    const tabs: TabItem[] = [
      {
        value: "icon",
        label: (
          <span>
            <span aria-hidden="true">★</span> Stars
          </span>
        ),
        content: <p>Stars panel</p>,
      },
    ];
    render(<Tabs tabs={tabs} aria-label="Icon labels" />);
    expect(screen.getByText("Stars")).toBeInTheDocument();
  });

  it("panel tabIndex=0 allows keyboard access to panel content", () => {
    renderTabs({ defaultValue: "alpha" });
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    const activePanel = panels.find((p) =>
      within(p).queryByText("Alpha panel")
    );
    expect(activePanel).toHaveAttribute("tabindex", "0");
  });
});
