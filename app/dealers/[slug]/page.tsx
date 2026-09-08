import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";

interface Props {
  params: { slug: string };
}

export default async function DealerStorefrontPage({ params }: Props) {
  const supabase = createClient();

  const { data: dealer } = await supabase
    .from("dealers")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (!dealer) return notFound();

  const { data: listings } = await supabase
    .from("listings")
    .select("*, listing_images(url, sort_order)")
    .eq("seller_id", dealer.user_id)
    .eq("status", "active");

  return (
    <main className="px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {dealer.business_name}
            {dealer.verified && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                Verified dealer
              </span>
            )}
          </h1>
          <p className="text-gray-600">{dealer.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {listings?.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </main>
  );
}
