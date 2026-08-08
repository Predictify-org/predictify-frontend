import fs from "node:fs";
import path from "node:path";

describe("StreamPanel print presentation", () => {
  const componentPath = path.join(process.cwd(), "src/pages/StreamPanel.tsx");
  const printCssPath = path.join(process.cwd(), "src/styles/print.css");

  it("provides a print stylesheet for StreamPanel", () => {
    const css = fs.readFileSync(printCssPath, "utf8");
    expect(css).toContain("@media print");
    expect(css).toContain(".stream-panel-container");
    expect(css).toContain(".sr-only");
    expect(css).toContain("display: none !important");
  });

  it("connects StreamPanel to the print stylesheet", () => {
    const component = fs.readFileSync(componentPath, "utf8");
    expect(component).toContain('import "../styles/print.css";');
    expect(component).toContain("stream-panel-container");
  });
});