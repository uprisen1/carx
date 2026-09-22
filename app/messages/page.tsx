import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, listings(make, model, year)")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  return (
    <main className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <div className="space-y-2">
        {conversations?.map((c) => (
          <Link
            key={c.id}
            href={`/messages/${c.id}`}
            className="block border rounded-lg p-4 bg-white hover:shadow-sm transition"
          >
            <p className="font-medium">
              {c.listings?.year} {c.listings?.make} {c.listings?.model}
            </p>
            <p className="text-sm text-gray-500">Open conversation →</p>
          </Link>
        ))}
        {!conversations?.length && (
          <p className="text-gray-500 text-sm">No conversations yet.</p>
        )}
      </div>
    </main>
  );
}
