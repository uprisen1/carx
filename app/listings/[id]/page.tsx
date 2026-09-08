import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: { id: string };
}

export default async function ListingDetailPage({ params }: Props) {
  const supabase = createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("*, listing_images(url, sort_order), profiles(full_name, phone)")
    .eq("id", params.id)
    .single();

  if (!listing) return notFound();

  return (
    <main className="px-6 py-8 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative w-full h-72 bg-gray-100 rounded-lg overflow-hidden">
          <Image
            src={listing.listing_images?.[0]?.url ?? "/placeholder-car.jpg"}
            alt={`${listing.make} ${listing.model}`}
            fill
            className="object-cover"
          />
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            {listing.year} {listing.make} {listing.model}
          </h1>
          <p className="text-xl font-semibold mt-2">
            KES {listing.price.toLocaleString()}
          </p>

          <dl className="grid grid-cols-2 gap-2 mt-4 text-sm">
            <dt className="text-gray-500">Mileage</dt>
            <dd>{listing.mileage?.toLocaleString() ?? "N/A"} km</dd>
            <dt className="text-gray-500">Transmission</dt>
            <dd className="capitalize">{listing.transmission ?? "N/A"}</dd>
            <dt className="text-gray-500">Fuel type</dt>
            <dd className="capitalize">{listing.fuel_type ?? "N/A"}</dd>
            <dt className="text-gray-500">Condition</dt>
            <dd className="capitalize">{listing.condition?.replace("_", " ") ?? "N/A"}</dd>
            <dt className="text-gray-500">Location</dt>
            <dd>{listing.location ?? "N/A"}</dd>
          </dl>

          <p className="mt-4 text-gray-700">{listing.description}</p>

          {/* Client component would go here to start a conversation via Supabase */}
          <button className="mt-6 w-full bg-black text-white py-3 rounded-lg">
            Message seller
          </button>
        </div>
      </div>
    </main>
  );
}
