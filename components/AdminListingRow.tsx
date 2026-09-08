"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Listing } from "@/lib/supabase/types";

interface Props {
  listing: Listing & { profiles?: { full_name: string | null; phone: string | null } };
}

export default function AdminListingRow({ listing }: Props) {
  const supabase = createClient();
  const [status, setStatus] = useState(listing.status);
  const [busy, setBusy] = useState(false);

  async function decide(next: "active" | "rejected") {
    setBusy(true);
    const { error } = await supabase
      .from("listings")
      .update({ status: next })
      .eq("id", listing.id);
    setBusy(false);
    if (!error) setStatus(next);
  }

  if (status !== "pending") {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-500">
        {listing.year} {listing.make} {listing.model} — marked{" "}
        <span className="font-medium">{status}</span>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 bg-white flex justify-between items-center">
      <div>
        <p className="font-medium">
          {listing.year} {listing.make} {listing.model} — KES{" "}
          {listing.price.toLocaleString()}
        </p>
        <p className="text-sm text-gray-500">
          Seller: {listing.profiles?.full_name ?? "Unknown"}
          {listing.profiles?.phone ? ` · ${listing.profiles.phone}` : ""}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => decide("active")}
          className="bg-green-600 text-white px-3 py-1.5 rounded text-sm"
        >
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => decide("rejected")}
          className="bg-red-600 text-white px-3 py-1.5 rounded text-sm"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
