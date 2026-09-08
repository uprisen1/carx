import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gari Yangu | Buy & Sell Cars in Kenya",
  description:
    "Kenya's marketplace for second-hand and dealer cars — search, compare, and message sellers directly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
