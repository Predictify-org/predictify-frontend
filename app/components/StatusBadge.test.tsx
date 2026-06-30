/**
 * @jest-environment jsdom
 */

import { render } from "@testing-library/react";
const { screen } = require("@testing-library/react") as any;
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it.each([
    ["draft", "Draft"],
    ["active", "Active"],
    ["paused", "Paused"],
    ["ended", "Ended"],
  ] as const)("renders the %s variant with an accessible label", (status, label) => {
    render(<StatusBadge status={status} />);

    const badge = screen.getByLabelText(`Stream status: ${label}`);

    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveClass(`status-badge--${status}`);
  });

  it.each(["draft", "active", "paused", "ended"] as const)(
    "renders a decorative shape icon for %s (color is not the only differentiator)",
    (status) => {
      const { container } = render(<StatusBadge status={status} />);
      const icon = container.querySelector(`.status-icon--${status}`);

      expect(icon).not.toBeNull();
      // The shape is decorative; the text label conveys status to AT.
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect((icon?.textContent ?? "").length).toBeGreaterThan(0);
    }
  );

  it("uses distinct glyphs across statuses", () => {
    const glyphs = (["draft", "active", "paused", "ended"] as const).map((status) => {
      const { container } = render(<StatusBadge status={status} />);
      return container.querySelector(`.status-icon--${status}`)?.textContent;
    });
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });
});
