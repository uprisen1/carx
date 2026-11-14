"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePresence } from "@/components/PresenceProvider";
import NotificationToggle from "@/components/NotificationToggle";

interface Row {
  id: string;
  title: string;
  otherId: string;
  otherName: string;
  lastBody: string | null;
  lastFromMe: boolean;
  lastAt: string;
  unread: number;
}

interface ConvoRaw {
  id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  listings: { make: string; model: string; year: number } | null;
}

interface MsgRaw {
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

function shortTime(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export default function ConversationList({ userId }: { userId: string }) {
  const [supabase] = useState(() => createClient());
  const { onlineIds } = usePresence();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: convos } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id, created_at, listings(make, model, year)")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    const list = (convos ?? []) as unknown as ConvoRaw[];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const ids = list.map((c) => c.id);
    const otherIds = Array.from(
      new Set(list.map((c) => (c.buyer_id === userId ? c.seller_id : c.buyer_id)))
    );

    const [{ data: msgData }, { data: profData }] = await Promise.all([
      supabase
        .from("messages")
        .select("conversation_id, sender_id, body, created_at, read_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("profiles").select("id, full_name").in("id", otherIds),
    ]);

    const msgs = (msgData ?? []) as MsgRaw[];
    const names = new Map<string, string>();
    (profData ?? []).forEach((p: { id: string; full_name: string | null }) =>
      names.set(p.id, p.full_name ?? "User")
    );

    const built: Row[] = list.map((c) => {
      const mine = msgs.filter((m) => m.conversation_id === c.id); // newest first
      const last = mine[0];
      const otherId = c.buyer_id === userId ? c.seller_id : c.buyer_id;
      return {
        id: c.id,
        title: c.listings
          ? `${c.listings.year} ${c.listings.make} ${c.listings.model}`
          : "Listing unavailable",
        otherId,
        otherName: names.get(otherId) ?? "User",
        lastBody: last?.body ?? null,
        lastFromMe: last?.sender_id === userId,
        lastAt: last?.created_at ?? c.created_at,
        unread: mine.filter((m) => m.sender_id !== userId && !m.read_at).length,
      };
    });

    built.sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));
    setRows(built);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`inbox-list-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, supabase, userId]);

  const totalUnread = rows.reduce((sum, r) => sum + r.unread, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">Messages</h1>
      <p className="text-sm text-gray-500 mb-6">
        {rows.length} conversation{rows.length === 1 ? "" : "s"}
        {totalUnread > 0 && ` · ${totalUnread} unread`}
      </p>

      <NotificationToggle />

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!loading && rows.length === 0 && (
        <p className="text-gray-500 text-sm">No conversations yet.</p>
      )}

      <div className="space-y-2">
        {rows.map((r) => {
          const online = onlineIds.has(r.otherId);
          return (
            <Link
              key={r.id}
              href={`/messages/${r.id}`}
              className="flex items-start gap-3 border rounded-lg p-4 bg-white hover:shadow-sm transition"
            >
              <div className="min-w-0 flex-1">
                <p className={`capitalize truncate ${r.unread ? "font-bold" : "font-medium"}`}>
                  {r.title}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      online ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  {r.otherName} · {online ? "Online" : "Offline"}
                </p>
                <p
                  className={`mt-1 text-sm truncate ${
                    r.unread ? "text-gray-900 font-medium" : "text-gray-500"
                  }`}
                >
                  {r.lastBody
                    ? `${r.lastFromMe ? "You: " : ""}${r.lastBody}`
                    : "No messages yet"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-gray-400">{shortTime(r.lastAt)}</span>
                {r.unread > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-xs font-semibold text-white">
                    {r.unread}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
