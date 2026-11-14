import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Open /api/push/status while logged in to see what is (not) set up.
// It only reports yes/no and counts, never the keys themselves.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ loggedIn: false, hint: "Log in first, then open this page again." });
  }

  const report: Record<string, unknown> = {
    loggedIn: true,
    publicVapidKeyOnServer: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    privateVapidKey: Boolean(process.env.VAPID_PRIVATE_KEY),
    vapidSubject: Boolean(process.env.VAPID_SUBJECT),
    secretSupabaseKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  const admin = createAdminClient();
  if (!admin) {
    report.problem = "SUPABASE_SERVICE_ROLE_KEY is missing, so notifications can't be sent.";
    return NextResponse.json(report);
  }

  const subs = await admin
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  report.table_push_subscriptions = subs.error ? `PROBLEM: ${subs.error.message}` : "ok";
  report.myDevicesWithAlertsOn = subs.count ?? 0;

  const log = await admin.from("push_log").select("kind", { count: "exact", head: true });
  report.table_push_log = log.error ? `PROBLEM: ${log.error.message}` : "ok";

  const me = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  report.iAmAdmin = me.data?.is_admin ?? false;

  const admins = await admin.from("profiles").select("id").eq("is_admin", true);
  report.adminAccounts = admins.data?.length ?? 0;
  const adminIds = (admins.data ?? []).map((a: { id: string }) => a.id);
  if (adminIds.length) {
    const adminSubs = await admin
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .in("user_id", adminIds);
    report.adminDevicesWithAlertsOn = adminSubs.count ?? 0;
  }

  return NextResponse.json(report);
}
