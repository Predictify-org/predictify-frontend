import { render } from "@testing-library/react";
const { screen } = require("@testing-library/react") as any;
import { ErrorRecovery } from "./ErrorRecovery";

describe("ErrorRecovery", () => {
  const baseProps = {
    eyebrow: "Page not found",
    heading: "This page could not be found",
    body: "The link may be old, incomplete, or no longer available.",
    helperNote: "Ask for a fresh link if you followed an old one.",
    primaryAction: (
      <a className="button button--primary" href="/">
        Go to home
      </a>
    ),
    secondaryAction: (
      <a className="button button--secondary" href="/settings">
        Contact support
      </a>
    ),
  };

  it("renders a single main landmark with the heading as level 1", () => {
    render(<ErrorRecovery variant="not-found" {...baseProps} />);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /could not be found/i }),
    ).toBeInTheDocument();
  });

  it("exposes keyboard-operable recovery actions and a skip link", () => {
    render(<ErrorRecovery variant="not-found" {...baseProps} />);

    expect(screen.getByRole("link", { name: /go to home/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /contact support/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /skip to streampay home/i }),
    ).toBeInTheDocument();
  });

  it("shows a support reference when provided", () => {
    render(
      <ErrorRecovery variant="server" {...baseProps} reference="abc123" />,
    );

    expect(screen.getByText(/support reference/i)).toBeInTheDocument();
    expect(screen.getByText("abc123")).toBeInTheDocument();
  });

  it("omits the support reference when none is provided", () => {
    render(<ErrorRecovery variant="outage" {...baseProps} />);

    expect(screen.queryByText(/support reference/i)).not.toBeInTheDocument();
  });
});
