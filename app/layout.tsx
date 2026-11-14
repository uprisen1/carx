import "./globals.css";
import type { Metadata, Viewport } from "next";
import Navbar from "@/components/Navbar";
import PresenceProvider from "@/components/PresenceProvider";
import PushProvider from "@/components/PushProvider";
import NotificationPrompt from "@/components/NotificationPrompt";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Gari Yangu | Buy & Sell Cars in Kenya",
  description:
    "Kenya's marketplace for second-hand and dealer cars — search, compare, and message sellers directly.",
  icons: { icon: "/favicon.ico", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Gari Yangu" },
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = !!profile?.is_admin;
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <PresenceProvider userId={user?.id ?? null}>
          <PushProvider userId={user?.id ?? null} isAdmin={isAdmin}>
            <Navbar />
            {children}
            <NotificationPrompt />
          </PushProvider>
        </PresenceProvider>
      </body>
    </html>
  );
}
