import { connection } from "next/server";
import { notFound } from "next/navigation";
import ChatForm from "@/components/chat/ChatForm";
import { createAdminClient } from "@/lib/supabase/admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const instant = false;

/** Accepts the short link (/chat/sunrise-outfitters) or the original ID link, so shared links never break. */
export default async function CustomerChatPage({ params }: PageProps<"/chat/[handle]">) {
  await connection();
  const { handle } = await params;
  const value = decodeURIComponent(handle).toLowerCase();
  const column = uuidPattern.test(value) ? "id" : slugPattern.test(value) && value.length <= 40 ? "slug" : null;
  if (!column) notFound();

  const { data: organization, error } = await createAdminClient()
    .from("organizations")
    .select("id, name")
    .eq(column, value)
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
