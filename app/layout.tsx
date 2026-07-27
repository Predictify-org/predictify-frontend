import type React from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css"
import "./styles/patterns.css"
import "./styles/touch.css"
import "./styles/themes/high-contrast.css"
import { Providers } from "@/components/providers";
import { SkipToContent } from "@/app/components/SkipToContent";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata = {
  title: "Predictify - Prediction Platform",
  description: "Join thousands of predictors worldwide and start earning from your knowledge and intuition today.",
  generator: "v0.dev",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className} bg-[#060e20] text-[#dee5ff] min-h-screen selection:bg-cyan-400/30`}>
        {/* Skip-to-content: first focusable element in every page — WCAG 2.4.1 */}
        <SkipToContent />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
