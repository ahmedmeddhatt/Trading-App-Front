import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/providers/Providers";

export const metadata: Metadata = {
  title: "TradeDesk",
  description: "High-performance trading dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
