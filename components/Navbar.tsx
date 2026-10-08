import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function Navbar() {
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
    <header className="bg-white border-b">
      <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          Gari Yangu
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/listings" className="text-gray-600 hover:text-black">
            Browse
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-gray-600 hover:text-black">
                Dashboard
              </Link>
              <Link href="/messages" className="text-gray-600 hover:text-black">
                Messages
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-gray-600 hover:text-black">
                  Admin
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-gray-600 hover:text-black">
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="bg-black text-white px-3 py-1.5 rounded-lg"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
