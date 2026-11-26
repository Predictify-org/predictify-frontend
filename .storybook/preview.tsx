import type { Preview } from "@storybook/react";
import React, { useEffect } from "react";
import "@/app/globals.css";
import "@/app/styles/themes/high-contrast.css";
import { ThemeProvider } from "@/components/theme-provider";

export const globalTypes = {
  theme: {
    name: "Theme",
    description: "Global theme for components",
    defaultValue: "dark",
    toolbar: {
      icon: "circlehollow",
      items: [
        { value: "light", icon: "sun", title: "Light" },
        { value: "dark", icon: "moon", title: "Dark" },
        { value: "high-contrast", icon: "contrast", title: "High Contrast" },
      ],
      dynamicTitle: true,
    },
  },
  reducedMotion: {
    name: "Reduced Motion",
    description: "Simulate prefers-reduced-motion",
    defaultValue: "no-preference",
    toolbar: {
      icon: "accessibility",
      items: [
        { value: "no-preference", title: "Motion: Normal" },
        { value: "reduce", title: "Motion: Reduced" },
      ],
      dynamicTitle: true,
    },
  },
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      element: "#storybook-root",
      config: {},
      options: {},
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || "dark";
      const reducedMotion = context.globals.reducedMotion === "reduce";

      useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("light", "dark", "high-contrast");
        root.classList.add(theme);
        if (theme === "high-contrast") {
          root.setAttribute("data-theme", "high-contrast");
        } else {
          root.removeAttribute("data-theme");
        }
        if (reducedMotion) {
          root.classList.add("reduced-motion");
        } else {
          root.classList.remove("reduced-motion");
        }
      }, [theme, reducedMotion]);

      return (
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          enableSystem={false}
          forcedTheme={theme}
        >
          <div className={`p-4 bg-background text-foreground ${reducedMotion ? "motion-reduce" : ""}`}>
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export default preview;
