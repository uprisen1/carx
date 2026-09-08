import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminListingRow from "@/components/AdminListingRow";

export default async function AdminQueuePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const { data: pending } = await supabase
    .from("listings")
    .select("*, profiles(full_name, phone)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <main className="px-6 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Pending listings</h1>

      {!pending?.length && (
        <p className="text-gray-500 text-sm">Nothing waiting for review.</p>
      )}

      <div className="space-y-3">
        {pending?.map((listing) => (
          <AdminListingRow key={listing.id} listing={listing} />
        ))}
      </div>
    </main>
  );
}
