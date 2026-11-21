import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const ROLES = ["buyer", "private_seller", "dealer"];

// Both the email-confirmation link and "Continue with Google" land here.
// We swap the one-time code for a real login session, then open the dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Brand-new account made with Google: use the account type picked on the signup page
      const wanted = cookies().get("gy-signup-role")?.value;
      const isNew = Date.now() - new Date(data.user.created_at).getTime() < 5 * 60 * 1000;
      if (wanted && ROLES.includes(wanted) && isNew) {
        await supabase.from("profiles").update({ role: wanted }).eq("id", data.user.id);
      }

      const response = NextResponse.redirect(`${origin}/dashboard`);
      response.cookies.delete("gy-signup-role");
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=signin`);
}
