import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushConfigured, sendPush, type PushPayload, type SubRow } from "@/lib/push";

export const runtime = "nodejs";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

const ok = (extra: Record<string, unknown> = {}) => NextResponse.json({ ok: true, ...extra });

function clip(text: string, max = 120) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Makes sure each message / listing triggers at most ONE push, ever
async function claim(admin: Admin, kind: string, refId: string) {
  const { error } = await admin.from("push_log").insert({ kind, ref_id: refId });
  if (!error) return "ok" as const;
  if (error.code === "23505") return "duplicate" as const;
  console.error("push_log insert failed:", error.message);
  return "error" as const;
}

async function deliver(admin: Admin, subs: SubRow[], payload: PushPayload) {
  if (subs.length === 0) {
    console.log("push: nobody to notify for", payload.tag);
    return 0;
  }
  const dead = await sendPush(subs, payload);
  console.log("push sent:", payload.tag, "devices:", subs.length, "expired:", dead.length);
  if (dead.length) await admin.from("push_subscriptions").delete().in("endpoint", dead);
  return subs.length;
}

async function notifyMessage(admin: Admin, userId: string, messageId: string) {
  const { data: msg } = await admin
    .from("messages")
    .select("id, body, sender_id, conversation_id")
    .eq("id", messageId)
    .maybeSingle();
  if (!msg || msg.sender_id !== userId) return ok({ skipped: "not your message" });

  const { data: convo } = await admin
    .from("conversations")
    .select("buyer_id, seller_id, listing_id")
    .eq("id", msg.conversation_id)
    .maybeSingle();
  if (!convo || (convo.buyer_id !== userId && convo.seller_id !== userId)) {
    return ok({ skipped: "not in this conversation" });
  }

  const claimed = await claim(admin, "message", messageId);
  if (claimed !== "ok") return ok({ skipped: claimed });

  const recipientId = convo.buyer_id === userId ? convo.seller_id : convo.buyer_id;

  const [{ data: sender }, { data: listing }, { data: subs }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    admin.from("listings").select("make, model, year").eq("id", convo.listing_id).maybeSingle(),
    admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", recipientId),
  ]);

  const vehicle = listing ? `${listing.year} ${listing.make} ${listing.model}` : "your listing";
  const devices = await deliver(admin, (subs ?? []) as SubRow[], {
    title: sender?.full_name ?? "New message",
    body: `${vehicle}: ${clip(msg.body)}`,
    url: `/messages/${msg.conversation_id}`,
    tag: `conversation-${msg.conversation_id}`,
  });
  return ok({ sent: devices > 0, devices });
}

async function notifyListing(admin: Admin, userId: string, listingId: string) {
  const { data: listing } = await admin
    .from("listings")
    .select("id, make, model, year, price, seller_id, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.seller_id !== userId || listing.status !== "pending") {
    return ok({ skipped: "nothing to approve" });
  }

  const claimed = await claim(admin, "listing", listingId);
  if (claimed !== "ok") return ok({ skipped: claimed });

  const { data: admins } = await admin.from("profiles").select("id").eq("is_admin", true);
  const adminIds = (admins ?? []).map((a: { id: string }) => a.id).filter((id: string) => id !== userId);
  if (adminIds.length === 0) return ok({ skipped: "no other admins" });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", adminIds);

  const devices = await deliver(admin, (subs ?? []) as SubRow[], {
    title: "New listing awaiting approval",
    body: `${listing.year} ${listing.make} ${listing.model} · KES ${Number(listing.price).toLocaleString()}`,
    url: "/admin",
    tag: `listing-${listing.id}`,
  });
  return ok({ sent: devices > 0, devices });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json().catch(() => null);

  const admin = createAdminClient();
  if (!admin || !pushConfigured()) return ok({ skipped: "push not configured" });

  if (body?.type === "message" && typeof body.messageId === "string") {
    return notifyMessage(admin, user.id, body.messageId);
  }
  if (body?.type === "listing" && typeof body.listingId === "string") {
    return notifyListing(admin, user.id, body.listingId);
  }
  return NextResponse.json({ error: "Unknown request" }, { status: 400 });
}
