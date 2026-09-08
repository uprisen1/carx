import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";

export default async function HomePage() {
  const supabase = createClient();

  const { data: featured } = await supabase
    .from("listings")
    .select("*, listing_images(url, sort_order)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <main>
      <section className="bg-white border-b px-6 py-12 text-center">
        <h1 className="text-3xl font-bold mb-2">Find your next car in Kenya</h1>
        <p className="text-gray-600 mb-6">
          Search thousands of listings from private sellers and verified dealers.
        </p>
        <Link
          href="/listings"
          className="inline-block bg-black text-white px-6 py-3 rounded-lg"
        >
          Browse all listings
        </Link>
      </section>

      <section className="px-6 py-10">
        <h2 className="text-xl font-semibold mb-4">Featured listings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured?.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </main>
  );
}
