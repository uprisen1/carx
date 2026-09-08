"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/supabase/types";

interface Props {
  conversationId: string;
  currentUserId: string;
}

export default function MessageThread({ conversationId, currentUserId }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (active && data) setMessages(data);
    }
    loadInitial();

    // Subscribe to new messages in this conversation
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
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: body.trim(),
    });

    if (!error) setBody("");
  }

  return (
    <div className="flex flex-col h-96 border rounded-lg bg-white">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
              m.sender_id === currentUserId
                ? "bg-black text-white ml-auto"
                : "bg-gray-100 text-gray-900"
            }`}
          >
            {m.body}
          </div>
        ))}
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
