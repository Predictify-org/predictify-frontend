import type { Metadata } from "next";
import "./globals.css";
import SplashScreen from "./components/SplashScreen";

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
    <html lang="en">
      <body>
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
