import type React from "react";
import type { Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css"
import "./styles/patterns.css"
import "./styles/touch.css"
import "./styles/themes/high-contrast.css"
import "./styles/print.css"
import { Providers } from "@/components/providers";
import { SkipToContent } from "@/app/components/SkipToContent";
import { metadata as rootMetadata } from "@/app/metadata";

export { rootMetadata as metadata };

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const viewport: Viewport = {
  manifest: "/manifest.webmanifest",
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className} bg-background text-foreground min-h-screen selection:bg-cyan-400/30`}>
        {/* Skip-to-content: first focusable element in every page – WCAG 2.4.1 */}
        <SkipToContent />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
