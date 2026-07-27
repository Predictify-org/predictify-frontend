import { render } from "@testing-library/react";
import {
  getDocumentTitleForPathname,
  ROUTE_TITLES,
  useDocumentTitle,
  RouteDocumentTitle,
  UseDocumentTitleOptions,
} from "@/app/hooks/useDocumentTitle";
import { announce } from "@/hooks/use-global-live-region";
import { usePathname } from "next/navigation";

jest.mock("@/hooks/use-global-live-region", () => ({
  announce: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

function TitleProbe({ title, options }: { title: string; options?: UseDocumentTitleOptions }) {
  useDocumentTitle(title, options);

  return null;
}

describe("useDocumentTitle", () => {
  beforeEach(() => {
    document.title = "Previous title";
    jest.clearAllMocks();
  });

  it("sets document.title while mounted", () => {
    render(<TitleProbe title="Disputes | Predictify" />);

    expect(document.title).toBe("Disputes | Predictify");
  });

  it("restores the previous title on unmount by default", () => {
    const { unmount } = render(<TitleProbe title="Settings | Predictify" />);

    unmount();

    expect(document.title).toBe("Previous title");
  });

  it("does not restore the previous title on unmount if restoreOnUnmount is false", () => {
    const { unmount } = render(
      <TitleProbe title="Settings | Predictify" options={{ restoreOnUnmount: false }} />,
    );

    unmount();

    expect(document.title).toBe("Settings | Predictify");
  });

  it("updates the title when the input changes", () => {
    const { rerender } = render(<TitleProbe title="Dashboard | Predictify" />);

    rerender(<TitleProbe title="Markets | Predictify" />);

    expect(document.title).toBe("Markets | Predictify");
  });

  it("announces the title to SR when announceToSR option is enabled", () => {
    render(
      <TitleProbe title="Account Settings | Predictify" options={{ announceToSR: true }} />,
    );

    expect(document.title).toBe("Account Settings | Predictify");
    expect(announce).toHaveBeenCalledWith({
      message: "Account Settings | Predictify",
      priority: "polite",
    });
  });

  it("does not announce to SR when announceToSR is false or omitted", () => {
    render(<TitleProbe title="Dashboard | Predictify" />);

    expect(announce).not.toHaveBeenCalled();
  });
});

describe("RouteDocumentTitle", () => {
  beforeEach(() => {
    document.title = "Initial Title";
    jest.clearAllMocks();
  });

  it("sets document title and announces to screen reader on route change", () => {
    (usePathname as jest.Mock).mockReturnValue("/claims");

    render(<RouteDocumentTitle />);

    expect(document.title).toBe("Claims | Predictify");
    expect(announce).toHaveBeenCalledWith({
      message: "Claims | Predictify",
      priority: "polite",
    });
  });

  it("handles unknown pathnames gracefully", () => {
    (usePathname as jest.Mock).mockReturnValue("/some/unknown/route");

    render(<RouteDocumentTitle />);

    expect(document.title).toBe("Predictify");
    expect(announce).toHaveBeenCalledWith({
      message: "Predictify",
      priority: "polite",
    });
  });
});

describe("getDocumentTitleForPathname", () => {
  it("resolves exact route titles including new campaign routes", () => {
    expect(getDocumentTitleForPathname("/disputes")).toBe(ROUTE_TITLES["/disputes"]);
    expect(getDocumentTitleForPathname("/events/new")).toBe(ROUTE_TITLES["/events/new"]);
    expect(getDocumentTitleForPathname("/a11y-audit")).toBe("Accessibility Audit | Predictify");
    expect(getDocumentTitleForPathname("/claims")).toBe("Claims | Predictify");
    expect(getDocumentTitleForPathname("/markets")).toBe("Markets | Predictify");
    expect(getDocumentTitleForPathname("/settings/privacy")).toBe("Privacy Settings | Predictify");
  });

  it("normalizes trailing slashes, hashes, and query strings", () => {
    expect(getDocumentTitleForPathname("/settings/?tab=profile#security")).toBe(
      ROUTE_TITLES["/settings"],
    );
    expect(getDocumentTitleForPathname("/claims/?status=pending#list")).toBe("Claims | Predictify");
  });

  it("falls back to the nearest parent title for nested routes", () => {
    expect(getDocumentTitleForPathname("/events/new/review")).toBe(ROUTE_TITLES["/events/new"]);
    expect(getDocumentTitleForPathname("/markets/123")).toBe("Markets | Predictify");
    expect(getDocumentTitleForPathname("/settings/privacy/data")).toBe(
      "Privacy Settings | Predictify",
    );
  });

  it("returns a safe app title for unknown routes or empty/null input", () => {
    expect(getDocumentTitleForPathname("/unknown")).toBe("Predictify");
    expect(getDocumentTitleForPathname("")).toBe("Predictify - Prediction Platform");
    expect(getDocumentTitleForPathname(null)).toBe("Predictify - Prediction Platform");
    expect(getDocumentTitleForPathname(undefined)).toBe("Predictify - Prediction Platform");
  });
});
