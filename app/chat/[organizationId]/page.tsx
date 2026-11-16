import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
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
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Link className="text-sm font-medium text-slate-500 underline underline-offset-4 hover:text-slate-950" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">{organization.name}</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">How can we help?</h1>
          <p className="mt-3 text-slate-600">Send a message to the support team and we&apos;ll keep the conversation together.</p>
          <div className="mt-8">
            <ChatForm organizationId={organization.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
