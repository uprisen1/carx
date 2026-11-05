"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PresenceValue {
  onlineIds: Set<string>;
  unreadCount: number;
}

const PresenceContext = createContext<PresenceValue>({
  onlineIds: new Set(),
  unreadCount: 0,
});

export const usePresence = () => useContext(PresenceContext);

// Wraps the whole site for logged-in users. It:
//  - shares who is online (so chats can show Online / Offline)
//  - marks incoming messages as "delivered" as soon as the app receives them
//  - keeps the unread-message count for the navbar up to date
export default function PresenceProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const [supabase] = useState(() => createClient());
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setOnlineIds(new Set());
      setUnreadCount(0);
      return;
    }
    const uid: string = userId;
    let active = true;

    async function refreshUnread() {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", uid);
      if (active) setUnreadCount(count ?? 0);
    }

    async function markAllDelivered() {
      await supabase
        .from("messages")
        .update({ delivered_at: new Date().toISOString() })
        .is("delivered_at", null)
        .neq("sender_id", uid);
    }

    markAllDelivered().then(refreshUnread);

    // Who is online right now
    const presence = supabase.channel("online-users", {
      config: { presence: { key: uid } },
    });
    presence
      .on("presence", { event: "sync" }, () => {
        if (active) setOnlineIds(new Set(Object.keys(presence.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presence.track({ online_at: new Date().toISOString() });
        }
      });

    // New / updated messages anywhere in my conversations
    const feed = supabase
      .channel(`message-feed-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { id: string; sender_id: string };
          if (m.sender_id !== uid) {
            supabase
              .from("messages")
              .update({ delivered_at: new Date().toISOString() })
              .eq("id", m.id)
              .is("delivered_at", null)
              .then(() => {});
          }
          refreshUnread();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          refreshUnread();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(presence);
      supabase.removeChannel(feed);
    };
  }, [userId, supabase]);

  return (
    <PresenceContext.Provider value={{ onlineIds, unreadCount }}>
      {children}
    </PresenceContext.Provider>
  );
}
