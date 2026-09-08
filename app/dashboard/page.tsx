import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your listings</h1>
        <Link
          href="/dashboard/listings/new"
          className="bg-black text-white px-4 py-2 rounded-lg"
        >
          + New listing
        </Link>
      </div>

      <table className="w-full text-left bg-white rounded-lg border">
        <thead>
          <tr className="border-b text-sm text-gray-500">
            <th className="p-3">Car</th>
            <th className="p-3">Price</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {listings?.map((listing) => (
            <tr key={listing.id} className="border-b">
              <td className="p-3">
                {listing.year} {listing.make} {listing.model}
              </td>
              <td className="p-3">KES {listing.price.toLocaleString()}</td>
              <td className="p-3 capitalize">{listing.status}</td>
              <td className="p-3">
                <Link
                  href={`/dashboard/listings/${listing.id}/edit`}
                  className="text-blue-600 text-sm"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
