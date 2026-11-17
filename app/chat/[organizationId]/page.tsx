import { connection } from "next/server";
import { notFound } from "next/navigation";
import ChatForm from "@/components/chat/ChatForm";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ organizationId: string }> };

export const instant = false;

export default async function CustomerChatPage({ params }: Params) {
  await connection();
  const { organizationId } = await params;
  const { data: organization, error } = await createAdminClient()
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load chat organization: ${error.message}`);
  }
  if (!organization) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col bg-platform">
      <header className="bg-signal text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:p-8">
          <h1 className="text-3xl/tight font-bold tracking-[-0.02em] sm:text-4xl">{organization.name}</h1>
          <p className="mt-1 text-base text-white/90">Help desk</p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-8">
        <ChatForm organizationId={organization.id} organizationName={organization.name} />
      </div>

      <footer className="border-t border-rule bg-paper">
        <p className="mx-auto max-w-3xl p-4 text-sm text-ink-2 sm:px-8">Support desk powered by OmniDesk AI</p>
      </footer>
    </main>
  );
}
