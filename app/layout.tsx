import type React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { WalletProvider } from "@/context/WalletContext";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Prediction Platform Admin",
  description: "Admin interface for managing prediction events",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WalletProvider>{children}</WalletProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
