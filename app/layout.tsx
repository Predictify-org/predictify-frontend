import type { Metadata } from "next";
import "./globals.css";
import SplashScreen from "./components/SplashScreen";
import { ToastProvider } from "./components/ToastProvider";
import { getThemeScript } from "./utils/theme-noflash";

export const metadata: Metadata = {
  title: "StreamPay - Payment Streaming",
  description: "Real-time payment streaming on Stellar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: getThemeScript() }}
          suppressHydrationWarning
        />
      </head>
      <body>
        <ToastProvider>
          <SplashScreen />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
