import Link from "next/link";
import Image from "next/image";
import type { Listing, ListingImage } from "@/lib/supabase/types";

interface Props {
  listing: Listing & { listing_images?: ListingImage[] };
}

export default function ListingCard({ listing }: Props) {
  const cover =
    listing.listing_images?.sort((a, b) => a.sort_order - b.sort_order)[0]
      ?.url ?? "/placeholder-car.jpg";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-white rounded-lg border overflow-hidden hover:shadow-md transition"
    >
      <div className="relative w-full h-40 bg-gray-100">
        <Image src={cover} alt={`${listing.make} ${listing.model}`} fill className="object-cover" />
      </div>
      <div className="p-3">
        <p className="font-semibold">
          {listing.year} {listing.make} {listing.model}
        </p>
        <p className="text-sm text-gray-500">
          {listing.mileage ? `${listing.mileage.toLocaleString()} km` : "Mileage N/A"} ·{" "}
          {listing.location ?? "Location N/A"}
        </p>
        <p className="mt-1 font-bold">
          KES {listing.price.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
