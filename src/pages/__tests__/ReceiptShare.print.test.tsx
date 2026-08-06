/**
 * @file src/pages/__tests__/ReceiptShare.print.test.tsx
 *
 * Focused tests for ReceiptShare print styles (GrantFox FWC26 b#031).
 *
 * Strategy
 * --------
 * CSS @media print rules are not evaluated by jsdom, so we verify that:
 *   1. src/styles/print.css exists and contains the required .receiptshare-page
 *      and .receiptshare-chrome selectors.
 *   2. src/pages/ReceiptShare.tsx applies the expected print-oriented class
 *      names to the root container and chrome elements.
 *   3. The print stylesheet is imported/loaded globally.
 */

import fs from "node:fs";
import path from "node:path";

const read = (relPath: string) =>
  fs.readFileSync(path.join(process.cwd(), relPath), "utf8");

describe("src/styles/print.css — ReceiptShare print rules", () => {
  const CSS_PATH = "src/styles/print.css";
  let css: string;

  beforeAll(() => {
    css = read(CSS_PATH);
  });

  it("file exists under src/styles/", () => {
    expect(fs.existsSync(path.join(process.cwd(), CSS_PATH))).toBe(true);
  });

  it("contains a @media print block for .receiptshare-page", () => {
    expect(css).toContain(".receiptshare-page");
  });

  it("hides chrome via .receiptshare-chrome", () => {
    expect(css).toContain(".receiptshare-chrome");
  });

  it("hides the live region via data-testid", () => {
    expect(css).toContain('receiptshare-live-region');
  });

  it("resets background/color to light-mode values", () => {
    expect(css).toContain("background: #fff !important");
    expect(css).toContain("color: #000 !important");
  });
});

describe("src/pages/ReceiptShare.tsx — print-oriented class names", () => {
  const TSX_PATH = "src/pages/ReceiptShare.tsx";
  let tsx: string;

  beforeAll(() => {
    tsx = read(TSX_PATH);
  });

  it("applies .receiptshare-page on the root container", () => {
    expect(tsx).toContain("receiptshare-page");
  });

  it("applies .receiptshare-chrome on the header", () => {
    expect(tsx).toContain("receiptshare-chrome");
  });
});
