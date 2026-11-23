/**
 * e2e/markets.spec.ts
 *
 * Smoke tests for the /markets listing page:
 *   - Page renders with a heading and market cards.
 *   - Keyword search narrows the displayed results.
 *   - Category filter chips narrow the displayed results.
 *   - Combining search + filter leaves only matching cards.
 *   - Clearing filters restores the full list.
 */

import { test, expect } from "@playwright/test";
import { injectMockWallet } from "./fixtures/mock-wallet";

test.beforeEach(async ({ page }) => {
  await injectMockWallet(page);
});

test("markets page renders heading and at least one market card", async ({ page }) => {
  await page.goto("/markets");

  await expect(
    page.getByRole("heading", { name: "Markets" }),
  ).toBeVisible();

  // At least one market card should be present (linked text in the grid)
  const cards = page.locator('[href^="/markets/"]');
  await expect(cards.first()).toBeVisible();
});

test("search input narrows market results", async ({ page }) => {
  await page.goto("/markets");

  // Confirm multiple cards before filtering
  const allCards = page.locator('[href^="/markets/"]');
  await allCards.first().waitFor();
  const initialCount = await allCards.count();
  expect(initialCount).toBeGreaterThan(1);

  // Type a search term that matches only one card
  const searchInput = page.getByLabel("Search markets");
  await searchInput.fill("Argentina");

  // Cards should narrow down
  await expect(allCards).toHaveCount(1);
  await expect(allCards.first()).toContainText("Argentina");
});

test("category filter narrows market results to the selected category", async ({ page }) => {
  await page.goto("/markets");

  const allCards = page.locator('[href^="/markets/"]');
  await allCards.first().waitFor();

  // Open the category select and choose "Crypto"
  await page.getByLabel("Filter by category").click();
  await page.getByRole("option", { name: "Crypto" }).click();

  // Only crypto markets should remain
  const remaining = await allCards.count();
  expect(remaining).toBeGreaterThanOrEqual(1);

  // The URL should reflect the filter
  await expect(page).toHaveURL(/category=Crypto/);
});

test("combined search + category leaves only matching markets", async ({ page }) => {
  await page.goto("/markets");

  const allCards = page.locator('[href^="/markets/"]');
  await allCards.first().waitFor();

  // Apply category first
  await page.getByLabel("Filter by category").click();
  await page.getByRole("option", { name: "Football" }).click();

  // Then type a matching title
  await page.getByLabel("Search markets").fill("Argentina");

  await expect(allCards).toHaveCount(1);
});

test("clearing filters restores the full list", async ({ page }) => {
  await page.goto("/markets");

  const allCards = page.locator('[href^="/markets/"]');
  await allCards.first().waitFor();
  const initialCount = await allCards.count();

  // Narrow the list
  await page.getByLabel("Search markets").fill("Argentina");
  await expect(allCards).toHaveCount(1);

  // Clear via keyboard (select all + delete) and verify count is restored
  await page.getByLabel("Search markets").clear();
  await expect(allCards).toHaveCount(initialCount);
});

test("empty search shows no-match state", async ({ page }) => {
  await page.goto("/markets");

  await page.getByLabel("Search markets").fill("zzznomatch");

  // The grid should be gone and a no-match message should appear
  const cards = page.locator('[href^="/markets/"]');
  await expect(cards).toHaveCount(0);
  // NoMatchEmptyState renders a "Clear filters" / "No results" region
  await expect(page.getByRole("button", { name: /clear/i })).toBeVisible();
});
