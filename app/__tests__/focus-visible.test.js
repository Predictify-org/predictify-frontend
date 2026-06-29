const fs = require("fs");
const path = require("path");

describe("focus-visible CSS layer", () => {
  const focusCssPath = path.join(process.cwd(), "app/styles/focus.css");
  const globalsCssPath = path.join(process.cwd(), "app/globals.css");

  it("focus.css exists and declares the focus-visible-base @layer", () => {
    expect(fs.existsSync(focusCssPath)).toBe(true);
    const css = fs.readFileSync(focusCssPath, "utf8");
    expect(css).toContain("@layer focus-visible-base");
  });

  it("focus.css includes a :focus-visible rule with outline and offset", () => {
    const css = fs.readFileSync(focusCssPath, "utf8");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline:");
    expect(css).toContain("outline-offset:");
  });

  it("focus.css provides a dark-mode adjustment rule", () => {
    const css = fs.readFileSync(focusCssPath, "utf8");
    expect(css).toContain(".dark :focus-visible");
    expect(css).toContain("box-shadow");
  });

  it("app/globals.css imports the focus layer", () => {
    expect(fs.existsSync(globalsCssPath)).toBe(true);
    const globals = fs.readFileSync(globalsCssPath, "utf8");
    expect(globals).toContain("./styles/focus.css");
  });
});
