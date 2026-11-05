"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { usePresence } from "@/components/PresenceProvider";
import { notifyServer } from "@/lib/push-client";
import type { Message } from "@/lib/supabase/types";

interface Props {
  conversationId: string;
  currentUserId: string;
  listing?: {
    id: string;
    title: string;
    price: number | null;
    imageUrl: string | null;
  } | null;
  otherUser?: { id: string; name: string | null } | null;
}

// One tick = sent, two grey ticks = delivered, two blue ticks = read
function Ticks({ m }: { m: Message }) {
  if (m.read_at) return <span title="Read" className="text-sky-400">✓✓</span>;
  if (m.delivered_at) return <span title="Delivered" className="text-gray-300">✓✓</span>;
  return <span title="Sent" className="text-gray-300">✓</span>;
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageThread({
  conversationId,
  currentUserId,
  listing,
  otherUser,
}: Props) {
  const [supabase] = useState(() => createClient());
  const { onlineIds } = usePresence();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const online = otherUser ? onlineIds.has(otherUser.id) : false;

  // Marks everything the other person sent as read (only while the tab is visible)
  const markRead = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const now = new Date().toISOString();
    await supabase
      .from("messages")
      .update({ read_at: now, delivered_at: now })
      .eq("conversation_id", conversationId)
      .neq("sender_id", currentUserId)
      .is("read_at", null);
  }, [supabase, conversationId, currentUserId]);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (active && data) {
        setMessages(data);
        markRead();
      }
    }
    loadInitial();

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== currentUserId) markRead();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
        }
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") markRead();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, supabase, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: body.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      notifyServer({ type: "message", messageId: data.id });
      setBody("");
      setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
    }
  }

  return (
    <div className="flex flex-col h-[32rem] border rounded-lg bg-white overflow-hidden">
      {listing && (
        <Link
          href={`/listings/${listing.id}`}
          className="flex items-center gap-3 p-3 border-b hover:bg-gray-50"
        >
          {listing.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="h-14 w-20 rounded object-cover"
            />
          ) : (
            <div className="h-14 w-20 rounded bg-gray-100" />
          )}
          <div>
            <p className="font-medium text-sm capitalize">{listing.title}</p>
            {listing.price != null && (
              <p className="text-sm text-gray-600">KES {listing.price.toLocaleString()}</p>
            )}
          </div>
          <span className="ml-auto text-xs text-blue-600">View listing →</span>
        </Link>
      )}

      {otherUser && (
        <div className="flex items-center gap-2 px-3 py-2 border-b text-sm">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              online ? "bg-green-500" : "bg-gray-300"
            }`}
          />
          <span className="font-medium">{otherUser.name ?? "User"}</span>
          <span className="text-xs text-gray-500">{online ? "Online" : "Offline"}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                mine ? "bg-black text-white ml-auto" : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <div
                className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${
                  mine ? "text-gray-300" : "text-gray-500"
                }`}
              >
                <span>{clock(m.created_at)}</span>
                {mine && <Ticks m={m} />}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t p-2 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button type="submit" className="bg-black text-white px-4 py-2 rounded text-sm">
          Send
        </button>
      </form>
    </div>
  );
}
