import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessageThread from "@/components/MessageThread";

interface Props {
  params: { id: string };
}

export default async function ConversationPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, listings(id, make, model, year, price, listing_images(url, sort_order))")
    .eq("id", params.id)
    .single();

  if (!conversation) return notFound();
  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return notFound();
  }

  // Who is on the other end of this chat
  const otherId =
    conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", otherId)
    .maybeSingle();
  const otherUser = {
    id: otherId as string,
    name: (otherProfile?.full_name as string | null) ?? null,
  };

  const l = conversation.listings;
  const images = [...(l?.listing_images ?? [])].sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );
  const listing = l
    ? {
        id: l.id as string,
        title: `${l.year} ${l.make} ${l.model}`,
        price: (l.price as number | null) ?? null,
        imageUrl: (images[0]?.url as string | undefined) ?? null,
      }
    : null;

  return (
    <main className="px-6 py-8 max-w-2xl mx-auto">
      <MessageThread
        conversationId={conversation.id}
        currentUserId={user.id}
        listing={listing}
        otherUser={otherUser}
      />
    </main>
  );
}
