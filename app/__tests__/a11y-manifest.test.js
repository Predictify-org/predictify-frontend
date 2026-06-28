const fs = require("fs");
const path = require("path");

describe("a11y manifest", () => {
  const manifestPath = path.join(process.cwd(), "app/data/a11y-manifest.json");
  const docPath = path.join(process.cwd(), "docs/a11y-status.md");

  it("tracks the expected recent component statuses", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

    expect(manifest.board).toBe("grantfox-accessibility-audit");
    expect(manifest.campaign).toBe("GrantFox");
    expect(Array.isArray(manifest.components)).toBe(true);
    expect(manifest.components.length).toBeGreaterThanOrEqual(6);

    expect(manifest.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "connect-wallet-modal", status: "verified" }),
        expect.objectContaining({ id: "outcome-icons-and-dispute-states", status: "verified" }),
        expect.objectContaining({ id: "dispute-outcome-explainer", status: "verified" }),
        expect.objectContaining({ id: "error-recovery-screen", status: "verified" }),
        expect.objectContaining({ id: "virtualized-events-list", status: "verified" }),
        expect.objectContaining({ id: "new-event-form-focus-order", status: "partial" })
      ])
    );
  });

  it("keeps the markdown board aligned with the manifest component names", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const doc = fs.readFileSync(docPath, "utf8");

    for (const component of manifest.components) {
      expect(doc).toContain(component.name);
    }

    expect(doc).toContain("API changes: None");
    expect(doc).toContain("Visible product changes: None in this update");
  });
});
