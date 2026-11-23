/**
 * Tests for root layout metadata (issue #1015).
 *
 * Imports from app/metadata.ts (not layout.tsx) so the test does not pull in
 * next/font/google or CSS files, both of which require the Next.js transform.
 *
 * Key assertions:
 *  - no generator field
 *  - metadataBase.href matches NEXT_PUBLIC_APP_URL (trailing-slash normalised)
 *  - title template contains %s | Predictify
 *  - openGraph and twitter defaults exist with required fields
 *  - existing icons are preserved
 */

import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip a trailing slash from a URL string for comparison. */
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// Module factory – re-imported after env manipulation
// ---------------------------------------------------------------------------

function loadMetadata(): Metadata {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("../metadata") as { metadata: Metadata };
  return mod.metadata;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("root layout metadata", () => {
  const DEFAULT_URL = "http://localhost:3000";

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  // ── generator ─────────────────────────────────────────────────────────────

  it("does not include a generator field", () => {
    const metadata = loadMetadata();
    expect((metadata as Record<string, unknown>).generator).toBeUndefined();
  });

  // ── metadataBase ──────────────────────────────────────────────────────────

  it("sets metadataBase using the default app URL when env is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const metadata = loadMetadata();
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect(stripTrailingSlash(metadata.metadataBase!.href)).toBe(
      stripTrailingSlash(DEFAULT_URL),
    );
  });

  it("sets metadataBase from NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://predictify.app";
    jest.resetModules();
    const metadata = loadMetadata();
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect(stripTrailingSlash(metadata.metadataBase!.href)).toBe(
      "https://predictify.app",
    );
  });

  it("handles NEXT_PUBLIC_APP_URL with a trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://predictify.app/";
    jest.resetModules();
    const metadata = loadMetadata();
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect(stripTrailingSlash(metadata.metadataBase!.href)).toBe(
      "https://predictify.app",
    );
  });

  // ── title template ────────────────────────────────────────────────────────

  it("sets a title template containing %s | Predictify", () => {
    const metadata = loadMetadata();
    expect(typeof metadata.title).toBe("object");
    const title = metadata.title as { default: string; template: string };
    expect(title.template).toContain("%s");
    expect(title.template).toContain("Predictify");
  });

  it("has a default title", () => {
    const metadata = loadMetadata();
    const title = metadata.title as { default: string; template: string };
    expect(title.default).toBeTruthy();
  });

  // ── openGraph defaults ────────────────────────────────────────────────────

  it("has openGraph defaults", () => {
    const metadata = loadMetadata();
    expect(metadata.openGraph).toBeDefined();
  });

  it('sets openGraph type to "website"', () => {
    const metadata = loadMetadata();
    expect(metadata.openGraph?.type).toBe("website");
  });

  it("sets openGraph siteName", () => {
    const metadata = loadMetadata();
    expect(metadata.openGraph?.siteName).toBeTruthy();
  });

  it("sets openGraph title", () => {
    const metadata = loadMetadata();
    expect(metadata.openGraph?.title).toBeTruthy();
  });

  it("sets openGraph description", () => {
    const metadata = loadMetadata();
    expect(metadata.openGraph?.description).toBeTruthy();
  });

  it("sets openGraph images", () => {
    const metadata = loadMetadata();
    const images = metadata.openGraph?.images;
    expect(images).toBeDefined();
    expect(Array.isArray(images) ? images.length : 1).toBeGreaterThan(0);
  });

  // ── twitter defaults ──────────────────────────────────────────────────────

  it("has twitter defaults", () => {
    const metadata = loadMetadata();
    expect(metadata.twitter).toBeDefined();
  });

  it('sets twitter card to "summary_large_image"', () => {
    const metadata = loadMetadata();
    expect(metadata.twitter?.card).toBe("summary_large_image");
  });

  it("sets twitter title", () => {
    const metadata = loadMetadata();
    expect(metadata.twitter?.title).toBeTruthy();
  });

  it("sets twitter description", () => {
    const metadata = loadMetadata();
    expect(metadata.twitter?.description).toBeTruthy();
  });

  // ── existing icons preserved ──────────────────────────────────────────────

  it("keeps the icons configuration", () => {
    const metadata = loadMetadata();
    expect(metadata.icons).toBeDefined();
  });
});
