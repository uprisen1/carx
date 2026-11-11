"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// "Admin" link with a red number showing how many listings wait for approval
export default function AdminLink() {
  const [supabase] = useState(() => createClient());
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { count: pending } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    setCount(pending ?? 0);
  }, [supabase]);

  // Recount on every page change
  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    // Live updates when a listing is added or approved...
    const channel = supabase
      .channel("pending-listings")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => {
        refresh();
      })
      .subscribe();
    // ...with a backup recount every 30 seconds
    const timer = setInterval(refresh, 30000);
    window.addEventListener("pending-changed", refresh);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
      window.removeEventListener("pending-changed", refresh);
    };
  }, [supabase, refresh]);

  return (
    <Link href="/admin" className="text-gray-600 hover:text-black">
      Admin
      {count > 0 && (
        <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
