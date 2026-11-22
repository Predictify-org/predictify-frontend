import { configureAxe } from "jest-axe";

// jsdom has no layout or computed color rendering, so color contrast needs a browser audit.
export const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

export async function expectNoA11yViolations(
  container: Element,
): Promise<void> {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}
