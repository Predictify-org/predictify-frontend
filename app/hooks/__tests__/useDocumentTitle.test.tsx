import { render } from "@testing-library/react";
import {
  getDocumentTitleForPathname,
  ROUTE_TITLES,
  useDocumentTitle,
} from "@/app/hooks/useDocumentTitle";

function TitleProbe({ title }: { title: string }) {
  useDocumentTitle(title);

  return null;
}

describe("useDocumentTitle", () => {
  beforeEach(() => {
    document.title = "Previous title";
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

  it("updates the title when the input changes", () => {
    const { rerender } = render(<TitleProbe title="Dashboard | Predictify" />);

    rerender(<TitleProbe title="Markets | Predictify" />);

    expect(document.title).toBe("Markets | Predictify");
  });
});

describe("getDocumentTitleForPathname", () => {
  it("resolves exact route titles", () => {
    expect(getDocumentTitleForPathname("/disputes")).toBe(ROUTE_TITLES["/disputes"]);
    expect(getDocumentTitleForPathname("/events/new")).toBe(ROUTE_TITLES["/events/new"]);
  });

  it("normalizes trailing slashes, hashes, and query strings", () => {
    expect(getDocumentTitleForPathname("/settings/?tab=profile#security")).toBe(
      ROUTE_TITLES["/settings"],
    );
  });

  it("falls back to the nearest parent title for nested routes", () => {
    expect(getDocumentTitleForPathname("/events/new/review")).toBe(ROUTE_TITLES["/events/new"]);
  });

  it("returns a safe app title for unknown routes", () => {
    expect(getDocumentTitleForPathname("/unknown")).toBe("Predictify");
  });
});
