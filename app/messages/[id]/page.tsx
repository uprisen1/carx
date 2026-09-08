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
    .select("*, listings(make, model, year)")
    .eq("id", params.id)
    .single();

  if (!conversation) return notFound();
  if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
    return notFound();
  }

  return (
    <main className="px-6 py-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">
        {conversation.listings?.year} {conversation.listings?.make}{" "}
        {conversation.listings?.model}
      </h1>
      <MessageThread conversationId={conversation.id} currentUserId={user.id} />
    </main>
  );
}
