import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import SearchFilters from "@/components/SearchFilters";

interface Props {
  searchParams: {
    make?: string;
    minPrice?: string;
    maxPrice?: string;
    transmission?: string;
  };
}

export default async function ListingsPage({ searchParams }: Props) {
  const supabase = createClient();

  let query = supabase
    .from("listings")
    .select("*, listing_images(url, sort_order)")
    .eq("status", "active");

  if (searchParams.make) query = query.ilike("make", `%${searchParams.make}%`);
  if (searchParams.minPrice) query = query.gte("price", Number(searchParams.minPrice));
  if (searchParams.maxPrice) query = query.lte("price", Number(searchParams.maxPrice));
  if (searchParams.transmission) query = query.eq("transmission", searchParams.transmission);

  const { data: listings } = await query.order("created_at", { ascending: false });

  return (
    <main className="px-6 py-8">
      <SearchFilters />
      <p className="text-sm text-gray-500 my-4">
        {listings?.length ?? 0} cars found
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {listings?.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </main>
  );
}
