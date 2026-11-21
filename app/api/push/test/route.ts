import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushConfigured, sendPushDetailed, type SubRow } from "@/lib/push";

export const runtime = "nodejs";

// Sends a test notification to all of MY devices
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, reason: "Please log in first." }, { status: 401 });

  const admin = createAdminClient();
  if (!admin || !pushConfigured()) {
    return NextResponse.json({ ok: false, reason: "Notifications aren't fully set up on the server yet." });
  }

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subs || subs.length === 0) {
    return NextResponse.json({
      ok: false,
      reason: "This device isn't registered yet. Switch notifications off, then on again.",
    });
  }

  const result = await sendPushDetailed(subs as SubRow[], {
    title: "Notifications are working 🎉",
    body: "You'll get alerts like this for new messages.",
    url: "/messages",
    tag: "test",
  });

  if (result.dead.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", result.dead);
  }

  if (result.sent > 0) return NextResponse.json({ ok: true, devices: result.sent });

  const why = result.errors[0] ? ` (${result.errors[0].slice(0, 120)})` : "";
  return NextResponse.json({
    ok: false,
    reason: `The notification couldn't be delivered${why}. Switch notifications off, then on again.`,
  });
}
