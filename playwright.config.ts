import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Predictify end-to-end tests.
 *
 * The suite runs against a production build (`pnpm build && pnpm start`) so
 * that behaviour matches the deployed app. Locally you can swap the command
 * to `pnpm dev` by setting the E2E_USE_DEV=1 environment variable.
 *
 * See https://playwright.dev/docs/test-configuration
 */

const useDevServer = process.env.E2E_USE_DEV === "1";

export default defineConfig({
  testDir: "./e2e",

  /* Run tests in parallel within a file; isolate browser contexts across files. */
  fullyParallel: true,

  /* Fail the CI build on any test.only left in the source. */
  forbidOnly: !!process.env.CI,

  /* Retry once on CI to tolerate flaky timing; zero retries locally. */
  retries: process.env.CI ? 1 : 0,

  /* One worker on CI to avoid port collisions; auto-detect locally. */
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],

  use: {
    /* Base URL so tests can use relative paths like `page.goto('/markets')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",

    /* Collect traces on the first retry so failures are always debuggable. */
    trace: "on-first-retry",

    /* Screenshots on failure only. */
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: useDevServer ? "pnpm dev" : "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000, // production builds can be slow
    env: {
      /* Activate mock-wallet seam so no real extension is required. */
      NEXT_PUBLIC_E2E_MOCK_WALLET: "1",
    },
  },
});
