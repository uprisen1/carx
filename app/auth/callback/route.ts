import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The email confirmation link lands here. We swap the one-time code in the
// link for a real login session, then send the person to their dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
