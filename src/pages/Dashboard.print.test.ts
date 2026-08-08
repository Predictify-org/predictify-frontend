import fs from "node:fs";
import path from "node:path";

describe("Dashboard print presentation", () => {
  const dashboardPath = path.join(process.cwd(), "src/pages/Dashboard.tsx");
  const printCssPath = path.join(process.cwd(), "src/styles/print.css");

  it("provides a print stylesheet for Dashboard", () => {
    const css = fs.readFileSync(printCssPath, "utf8");
    expect(css).toContain("@media print");
    expect(css).toContain(".dashboard-chrome");
    expect(css).toContain("display: none !important");
  });

  it("connects Dashboard to the print stylesheet", () => {
    const component = fs.readFileSync(dashboardPath, "utf8");
    expect(component).toContain('import "../styles/print.css";');
    expect(component).toContain("dashboard-container");
    expect(component).toContain("dashboard-chrome");
  });
});