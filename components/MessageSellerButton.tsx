"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  listingId: string;
  sellerId: string;
}

export default function MessageSellerButton({ listingId, sellerId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (user.id === sellerId) {
      setError("You can't message your own listing.");
      setBusy(false);
      return;
    }

    // Reuse an existing conversation for this buyer/seller/listing if one exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (existing) {
      router.push(`/messages/${existing.id}`);
      return;
    }

    const { data: created, error: insertError } = await supabase
      .from("conversations")
      .insert({ listing_id: listingId, buyer_id: user.id, seller_id: sellerId })
      .select()
      .single();

    setBusy(false);

    if (insertError || !created) {
      setError(insertError?.message ?? "Could not start conversation.");
      return;
    }

    router.push(`/messages/${created.id}`);
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={busy}
        className="mt-6 w-full bg-black text-white py-3 rounded-lg"
      >
        {busy ? "Starting conversation…" : "Message seller"}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
