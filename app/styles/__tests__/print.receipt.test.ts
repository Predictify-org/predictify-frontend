/**
 * @file app/styles/__tests__/print.receipt.test.ts
 *
 * Focused tests for the print-friendly receipt layout (GrantFox FWC26).
 *
 * Strategy
 * --------
 * CSS @media print rules are not evaluated by jsdom, so we test by:
 *   1. Verifying that `app/styles/print.css` exists and contains the expected
 *      CSS constructs (file-content assertions — same pattern used by
 *      `src/pages/ClaimFlow.print.test.ts` already in this repo).
 *   2. Verifying that `app/layout.tsx` imports the print stylesheet so it is
 *      loaded globally.
 *   3. Verifying that `app/globals.css` no longer contains a duplicate inline
 *      `@media print` receipt block (guards against regression).
 *   4. Verifying the Receipt component renders the print trigger and exposes
 *      the correct DOM structure for the print isolation pattern.
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a project file relative to the repository root. */
const read = (relPath: string) =>
  fs.readFileSync(path.join(process.cwd(), relPath), "utf8");

// ---------------------------------------------------------------------------
// 1. print.css — file exists and contains required rules
// ---------------------------------------------------------------------------

describe("app/styles/print.css — existence and required rules", () => {
  const CSS_PATH = "app/styles/print.css";
  let css: string;

  beforeAll(() => {
    css = read(CSS_PATH);
  });

  it("file is present under app/styles/", () => {
    expect(fs.existsSync(path.join(process.cwd(), CSS_PATH))).toBe(true);
  });

  it("declares a top-level @media print block", () => {
    expect(css).toContain("@media print");
  });

  it("resets design tokens to light-mode values for dark-mode safety", () => {
    // The token reset must target both :root and .dark so dark-mode users
    // receive white paper / black text rather than white text on white.
    expect(css).toMatch(/(:root|\.dark)/);
    expect(css).toContain("--background: 0 0% 100%");
    expect(css).toContain("--foreground: 0 0% 3.9%");
  });

  it("sets @page margins to provide a print safe-zone", () => {
    expect(css).toContain("@page");
    expect(css).toContain("margin:");
  });

  it("defines the visibility-isolation pattern (.receipt-wrapper)", () => {
    expect(css).toContain(".receipt-wrapper");
    expect(css).toContain("visibility: hidden");
    expect(css).toContain("visibility: visible");
  });

  it("targets .receipt-container to isolate the receipt card", () => {
    expect(css).toContain(".receipt-container");
    expect(css).toContain("break-inside: avoid");
  });

  it("hides UI chrome via .print-hide and data-print selector", () => {
    expect(css).toContain(".print-hide");
    expect(css).toContain('[data-print="hide"]');
    expect(css).toContain("display: none !important");
  });

  it("enables print-color-adjust so backgrounds print correctly", () => {
    expect(css).toContain("print-color-adjust: exact");
    expect(css).toContain("-webkit-print-color-adjust: exact");
  });

  it("suppresses all animations and transitions for print", () => {
    expect(css).toContain("animation: none !important");
    expect(css).toContain("transition: none !important");
  });

  it("includes the GrantFox FWC26 campaign attribution footer", () => {
    // The attribution is appended via CSS ::after on .receipt-container.
    expect(css).toContain(".receipt-container::after");
    expect(css).toContain("GrantFox FWC26");
    expect(css).toContain("predictify.app");
  });

  it("specifies WCAG-safe foreground colour for muted receipt labels", () => {
    // #374151 = Tailwind gray-700, contrast ratio 10.7:1 on white.
    expect(css).toContain("#374151");
  });
});

// ---------------------------------------------------------------------------
// 2. app/layout.tsx — imports the print stylesheet globally
// ---------------------------------------------------------------------------

describe("app/layout.tsx — print stylesheet is imported globally", () => {
  let layout: string;

  beforeAll(() => {
    layout = read("app/layout.tsx");
  });

  it("imports app/styles/print.css", () => {
    expect(layout).toContain('./styles/print.css"');
  });
});

// ---------------------------------------------------------------------------
// 3. app/globals.css — no duplicate receipt @media print block
// ---------------------------------------------------------------------------

describe("app/globals.css — duplicate print block removed", () => {
  let globals: string;

  beforeAll(() => {
    globals = read("app/globals.css");
  });

  it("no longer contains the visibility-isolation receipt rules inline", () => {
    // The receipt isolation rules now live only in app/styles/print.css.
    // If they re-appear in globals.css it is a regression.
    expect(globals).not.toContain(".receipt-wrapper, .receipt-wrapper *");
  });

  it("contains a comment pointing to app/styles/print.css", () => {
    expect(globals).toContain("app/styles/print.css");
  });
});

// ---------------------------------------------------------------------------
// 4. Receipt component — DOM structure for print
// ---------------------------------------------------------------------------

describe("components/receipts/Receipt.tsx — print trigger and structure", () => {
  let receipt: string;

  beforeAll(() => {
    receipt = read("components/receipts/Receipt.tsx");
  });

  it("renders a button that calls window.print()", () => {
    expect(receipt).toContain("window.print()");
  });

  it("labels the print button as 'Print Receipt'", () => {
    // The previous label 'Download Receipt' was inaccurate; confirm renamed.
    expect(receipt).toContain("Print Receipt");
    expect(receipt).not.toContain("Download Receipt");
  });

  it("includes aria-label on the print button for screen-reader users", () => {
    expect(receipt).toContain('aria-label="Print this receipt"');
  });

  it("wraps action buttons with .print-hide class", () => {
    // The action wrapper must carry .print-hide so the buttons are hidden
    // by the visibility-isolation pattern in print.css.
    expect(receipt).toContain("print-hide");
  });

  it("adds data-print=\"hide\" to the action wrapper", () => {
    // Belt-and-suspenders: data-print selector is also targeted in print.css.
    expect(receipt).toContain('data-print="hide"');
  });

  it("wraps the receipt in .receipt-wrapper for print isolation", () => {
    expect(receipt).toContain("receipt-wrapper");
  });

  it("wraps the receipt card in .receipt-container", () => {
    expect(receipt).toContain("receipt-container");
  });

  it("uses aria-hidden on decorative icons", () => {
    expect(receipt).toContain('aria-hidden="true"');
  });

  it("includes the Printer icon (not the Download icon)", () => {
    // Visual affordance should match the action — a printer icon for print.
    expect(receipt).toContain("Printer");
    expect(receipt).not.toContain("Download");
  });
});
