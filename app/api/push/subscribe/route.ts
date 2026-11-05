import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Save this device so it can receive notifications
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "Bad subscription" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true, skipped: "server key missing" });

  // One device belongs to one account: if someone else used it before, replace them
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  const { error } = await admin.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint,
    p256dh,
    auth,
    user_agent: request.headers.get("user-agent"),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Forget this device (turning notifications off, or logging out)
export async function DELETE(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: true });

  const body = await request.json().catch(() => null);
  if (typeof body?.endpoint === "string") {
    // Row Level Security means this can only ever delete my own devices
    await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
  }
  return NextResponse.json({ ok: true });
}
