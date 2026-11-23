import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSearchParams } from "next/navigation";
import { expectNoA11yViolations } from "@/test-utils/axe";
import MarketsPage from "@/app/markets/page";
import MarketDetailPage from "@/app/markets/[id]/page";
import ClaimsPage from "@/app/(dashboard)/claims/page";
import { FilteredClaimsEmptyState } from "@/components/claims/FilteredClaimsEmptyState";
import DisputesPage from "@/app/(dashboard)/disputes/page";
import AccountSettingsPage from "@/app/settings/account/page";
import LanguageSettingsPage from "@/app/settings/language/page";
import MotionSettingsPage from "@/app/settings/motion/page";
import PrivacySettingsPage from "@/app/settings/privacy/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/markets",
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

jest.mock("@/context/WalletContext", () => ({
  useWalletContext: () => ({ address: null }),
}));

jest.mock("@/app/components/PredictionCommentsLoader", () => ({
  __esModule: true,
  default: () => <section aria-label="Prediction comments" />,
}));

jest.mock("@/app/components/AboutMarketModal", () => ({
  AboutMarketModal: () => <button type="button">About this market</button>,
}));

jest.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

jest.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({
    languageCode: "en",
    setLanguage: jest.fn(),
    isReady: true,
    languages: [
      { code: "en", label: "English", nativeLabel: "English" },
      { code: "es", label: "Spanish", nativeLabel: "Español" },
    ],
  }),
}));

jest.mock("@/app/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const messages: Record<string, string> = {
        "settings.language.title": "Language",
        "settings.language.description": "Choose your preferred language.",
        "settings.language.active": "Active",
        "settings.language.saved_note": "Your choice is saved.",
        "a11y.language_select": "Select a language",
      };
      return messages[key] ?? key;
    },
  }),
}));

async function auditRendered(ui: React.ReactElement) {
  cleanup();
  const result = render(ui);
  await expectNoA11yViolations(result.container);
  return result;
}

describe("priority route accessibility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it("audits markets in its default and no-results states, including the open category menu", async () => {
    const user = userEvent.setup();
    render(<main><MarketsPage /></main>);
    await screen.findByRole("heading", { name: "Markets" });
    await expectNoA11yViolations(document.body);

    const categoryFilter = screen.getByRole("combobox", { name: "Filter by category" });
    categoryFilter.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("option", { name: "All categories" });
    // Radix portals this listbox outside the route landmark; axe's region rule
    // reports that portal placement, so audit the route states and verify the
    // open listbox's accessible option name separately.
    await user.keyboard("{Escape}");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search markets" }), {
      target: { value: "no matching market" },
    });
    expect(await screen.findByText(/no markets match/i)).toBeInTheDocument();
    await expectNoA11yViolations(document.body);
  });

  it("audits the market detail route and its activity tab", async () => {
    const params = { params: Promise.resolve({ id: "fwc26-arg" }) };

    render(await MarketDetailPage(params));
    await screen.findByText(/Market status is/i);
    await expectNoA11yViolations(document.body);

    // Market detail tabs are URL-driven (`?tab=`), so select the Activity tab
    // through the mocked search params rather than relying on a router push.
    cleanup();
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("tab=activity"),
    );
    try {
      render(await MarketDetailPage(params));
      expect(
        await screen.findByRole("tabpanel", { name: "Activity" }),
      ).toBeVisible();
      await expectNoA11yViolations(document.body);
    } finally {
      (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    }
  });

  it("audits claims while loading, when populated, and when a filter is empty", async () => {
    render(<main><ClaimsPage /></main>);
    await expectNoA11yViolations(document.body);

    expect(
      await screen.findByRole("button", { name: /claim 18 xlm/i }, { timeout: 3000 }),
    ).toBeInTheDocument();
    await expectNoA11yViolations(document.body);

    cleanup();
    const emptyState = render(
      <main>
        <FilteredClaimsEmptyState activeTab="Resolved" onReset={jest.fn()} />
      </main>,
    );
    expect(screen.getByText("No claims match this filter")).toBeInTheDocument();
    await expectNoA11yViolations(emptyState.container);
  });

  it("audits disputes, its filtered empty state, and the open review dialog", async () => {
    const user = userEvent.setup();
    render(<main><DisputesPage /></main>);
    await expectNoA11yViolations(document.body);

    fireEvent.change(screen.getByRole("searchbox", { name: /search disputes/i }), {
      target: { value: "no matching dispute" },
    });
    await expectNoA11yViolations(document.body);
    fireEvent.change(screen.getByRole("searchbox", { name: /search disputes/i }), {
      target: { value: "" },
    });

    await user.click(screen.getAllByRole("button", { name: "Review" })[0]);
    const dialog = await screen.findByRole("dialog");
    await expectNoA11yViolations(dialog);
  });

  it("audits all settings pages and the inactive account settings tab", async () => {
    const user = userEvent.setup();
    await auditRendered(<AccountSettingsPage />);
    await user.click(screen.getByRole("tab", { name: "Privacy" }));
    await expectNoA11yViolations(document.body);

    await auditRendered(<LanguageSettingsPage />);
    await auditRendered(<MotionSettingsPage />);
    await auditRendered(<PrivacySettingsPage />);
  });
});
