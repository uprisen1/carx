"use client";

import Link from "next/link";
import { usePresence } from "@/components/PresenceProvider";

export default function MessagesLink() {
  const { unreadCount } = usePresence();

  return (
    <Link href="/messages" className="text-gray-600 hover:text-black">
      Messages
      {unreadCount > 0 && (
        <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
