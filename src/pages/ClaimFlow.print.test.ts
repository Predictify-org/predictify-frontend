import fs from "node:fs";
import path from "node:path";

describe("ClaimFlow print presentation", () => {
  const claimFlowPath = path.join(process.cwd(), "src/pages/ClaimFlow.tsx");
  const printCssPath = path.join(process.cwd(), "src/styles/print.css");

  it("provides a print stylesheet for ClaimFlow", () => {
    const css = fs.readFileSync(printCssPath, "utf8");
    expect(css).toContain("@media print");
    expect(css).toContain(".claimflow-chrome");
    expect(css).toContain(".claimflow-live-region");
    expect(css).toContain("display: none !important");
  });

  it("opens expandable details before printing and restores their state", () => {
    const component = fs.readFileSync(claimFlowPath, "utf8");
    expect(component).toContain('addEventListener("beforeprint"');
    expect(component).toContain('querySelectorAll<HTMLDetailsElement>("details.claimflow-expandable")');
    expect(component).toContain('addEventListener("afterprint"');
  });

  it("connects ClaimFlow to the print stylesheet and print hooks", () => {
    const component = fs.readFileSync(claimFlowPath, "utf8");
    expect(component).toContain('import "../styles/print.css";');
    expect(component).toContain("claimflow-page");
    expect(component).toContain("claimflow-section");
    expect(component).toContain("claimflow-action");
  });
});
