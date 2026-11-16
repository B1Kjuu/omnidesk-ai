import { redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import CreateOrganizationForm from "@/components/dashboard/CreateOrganizationForm";
import CreateConversationForm from "@/components/dashboard/CreateConversationForm";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth");
  }

  const { data: organizations, error: organizationsError } = await supabase
    .from("organizations")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (organizationsError) {
    throw new Error(`Could not load organizations: ${organizationsError.message}`);
  }

  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id, status, created_at, customers(name, email), messages(id, sender_type, content, created_at)")
    .order("created_at", { ascending: false });

  if (conversationsError) {
    throw new Error(`Could not load conversations: ${conversationsError.message}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">OmniDesk AI</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
            <p className="mt-2 text-slate-600">{userData.user.email}</p>
          </div>
          <SignOutButton />
        </header>

        <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Your organizations</h2>
          {organizations.length > 0 ? (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {organizations.map((organization) => (
                <li key={organization.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-800">{organization.name}</p>
                  <Link className="mt-2 inline-block text-sm text-slate-500 underline underline-offset-4 hover:text-slate-950" href={`/chat/${organization.id}`}>
                    Open customer chat
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-slate-600">Create an organization to start managing customer support.</p>
          )}
          <CreateOrganizationForm />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Inbox</h2>
          <p className="mt-2 text-slate-600">Conversations currently stored for your organizations.</p>
          {conversations.length > 0 ? (
            <ul className="mt-6 space-y-4">
              {conversations.map((conversation) => (
                <li key={conversation.id} className="rounded-xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{conversation.customers?.name ?? "Unnamed customer"}</p>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">{conversation.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{conversation.customers?.email ?? "No email provided"}</p>
                  <ul className="mt-4 space-y-2 border-l-2 border-slate-200 pl-4">
                    {conversation.messages?.map((message) => (
                      <li key={message.id} className="text-sm text-slate-700">
                        <span className="font-medium">{message.sender_type}: </span>{message.content}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">No conversations yet.</p>
          )}
          <CreateConversationForm organizations={organizations} />
        </section>
      </div>
    </main>
  );
}
