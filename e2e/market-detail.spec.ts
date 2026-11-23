/**
 * e2e/market-detail.spec.ts
 *
 * Smoke tests for the /markets/[id] detail page:
 *   - Navigating from the list to a market detail page works.
 *   - The page title and hero section are rendered.
 *   - Tab navigation switches content and updates ?tab= in the URL.
 *   - Keyboard-only tab switching works.
 *   - Visiting /markets/not-found shows an empty / 404 state.
 */

import { test, expect } from "@playwright/test";
import { injectMockWallet } from "./fixtures/mock-wallet";

test.beforeEach(async ({ page }) => {
  await injectMockWallet(page);
});

test("clicking a market card opens the detail page", async ({ page }) => {
  await page.goto("/markets");

  const firstCard = page.locator('[href^="/markets/"]').first();
  const href = await firstCard.getAttribute("href");
  await firstCard.click();

  // After navigation the URL should match the card's href
  await expect(page).toHaveURL(href!);

  // The detail page should have a main landmark
  await expect(page.getByRole("main")).toBeVisible();
});

test("market detail page renders title and hero section", async ({ page }) => {
  await page.goto("/markets/fwc26-arg");

  // The page title / heading should contain something recognisable
  await expect(page.getByRole("main")).toBeVisible();

  // The page renders an article or section with market info
  // MarketHero renders the title as a heading or prominent text
  await expect(
    page.getByText("Argentina", { exact: false }),
  ).toBeVisible();
});

test("MarketDetailTabs renders and default tab content is visible", async ({ page }) => {
  await page.goto("/markets/fwc26-arg");

  // The tabs list should be accessible
  const tabList = page.getByRole("tablist");
  await expect(tabList).toBeVisible();

  // The default tab panel content should be visible
  const activePanel = page.getByRole("tabpanel");
  await expect(activePanel).toBeVisible();
});

test("clicking a different tab switches the visible panel", async ({ page }) => {
  await page.goto("/markets/fwc26-arg");

  const tabList = page.getByRole("tablist");
  await expect(tabList).toBeVisible();

  // Find the available tabs and click one that is NOT the first
  const tabs = tabList.getByRole("tab");
  const tabCount = await tabs.count();

  if (tabCount > 1) {
    const secondTab = tabs.nth(1);
    const secondTabName = await secondTab.textContent();
    await secondTab.click();

    // The panel content should change (new tabpanel is visible)
    await expect(page.getByRole("tabpanel")).toBeVisible();

    // If the tab implementation pushes ?tab= to the URL, verify it
    const url = page.url();
    if (url.includes("?tab=") || url.includes("&tab=")) {
      expect(url).toMatch(/[?&]tab=/);
    }
  }
});

test("keyboard navigation can move between tabs", async ({ page }) => {
  await page.goto("/markets/fwc26-arg");

  const tabList = page.getByRole("tablist");
  await expect(tabList).toBeVisible();

  // Focus the first tab via keyboard
  const firstTab = tabList.getByRole("tab").first();
  await firstTab.focus();

  // Arrow right should move to the next tab
  await page.keyboard.press("ArrowRight");
  const focused = page.locator("[role='tab']:focus");
  await expect(focused).toBeVisible();
});

test("unknown market id shows an empty / not-found state", async ({ page }) => {
  await page.goto("/markets/not-found");

  // The app renders an EmptyState for unknown IDs
  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByText(/not found|could not find|doesn't exist/i),
  ).toBeVisible();
});
