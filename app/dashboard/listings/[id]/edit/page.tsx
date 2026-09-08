"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ImageUploader from "@/components/ImageUploader";
import type { Listing } from "@/lib/supabase/types";

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setError("Listing not found, or you don't have access to it.");
      } else {
        setListing(data);
      }
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!listing) return;
    setError(null);

    const { error: updateError } = await supabase
      .from("listings")
      .update({
        make: listing.make,
        model: listing.model,
        year: listing.year,
        price: listing.price,
        mileage: listing.mileage,
        transmission: listing.transmission,
        fuel_type: listing.fuel_type,
        condition: listing.condition,
        location: listing.location,
        description: listing.description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/dashboard");
  }

  async function handleMarkSold() {
    if (!listing) return;
    await supabase.from("listings").update({ status: "sold" }).eq("id", listing.id);
    router.push("/dashboard");
  }

  async function handleDelete() {
    if (!listing) return;
    if (!confirm("Delete this listing permanently?")) return;
    await supabase.from("listings").delete().eq("id", listing.id);
    router.push("/dashboard");
  }

  if (loading) return <main className="px-6 py-8">Loading…</main>;
  if (error || !listing)
    return <main className="px-6 py-8 text-red-600">{error ?? "Not found."}</main>;

  return (
    <main className="px-6 py-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit listing</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <input
          className="border rounded px-3 py-2 w-full"
          value={listing.make}
          onChange={(e) => setListing({ ...listing, make: e.target.value })}
          placeholder="Make"
        />
        <input
          className="border rounded px-3 py-2 w-full"
          value={listing.model}
          onChange={(e) => setListing({ ...listing, model: e.target.value })}
          placeholder="Model"
        />
        <input
          type="number"
          className="border rounded px-3 py-2 w-full"
          value={listing.year}
          onChange={(e) => setListing({ ...listing, year: Number(e.target.value) })}
          placeholder="Year"
        />
        <input
          type="number"
          className="border rounded px-3 py-2 w-full"
          value={listing.price}
          onChange={(e) => setListing({ ...listing, price: Number(e.target.value) })}
          placeholder="Price (KES)"
        />
        <input
          type="number"
          className="border rounded px-3 py-2 w-full"
          value={listing.mileage ?? ""}
          onChange={(e) => setListing({ ...listing, mileage: Number(e.target.value) })}
          placeholder="Mileage (km)"
        />
        <input
          className="border rounded px-3 py-2 w-full"
          value={listing.location ?? ""}
          onChange={(e) => setListing({ ...listing, location: e.target.value })}
          placeholder="Location"
        />
        <textarea
          className="border rounded px-3 py-2 w-full h-28"
          value={listing.description ?? ""}
          onChange={(e) => setListing({ ...listing, description: e.target.value })}
          placeholder="Description"
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" className="bg-black text-white px-5 py-2 rounded-lg w-full">
          Save changes
        </button>
      </form>

      <div className="mt-6 border-t pt-6">
        <ImageUploader listingId={listing.id} />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleMarkSold}
          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg"
        >
          Mark as sold
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Delete listing
        </button>
      </div>
    </main>
  );
}
