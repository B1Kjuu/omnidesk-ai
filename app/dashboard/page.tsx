import { redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import CreateOrganizationForm from "@/components/dashboard/CreateOrganizationForm";
import CreateConversationForm from "@/components/dashboard/CreateConversationForm";
import CreateKnowledgeSourceForm from "@/components/dashboard/CreateKnowledgeSourceForm";
import KnowledgeSourceList from "@/components/dashboard/KnowledgeSourceList";
import TicketList from "@/components/dashboard/TicketList";
import WorkflowEventList from "@/components/dashboard/WorkflowEventList";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export const instant = false;

export default async function DashboardPage() {
  await connection();
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth?reason=session-expired");
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

  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select("id, organization_id, category, priority, status, created_at, conversations(customers(name, email))")
    .order("created_at", { ascending: false });

  if (ticketsError) {
    throw new Error(`Could not load tickets: ${ticketsError.message}`);
  }

  const { data: workflowEvents, error: workflowEventsError } = await supabase
    .from("workflow_events")
    .select("id, event_type, status, last_error, created_at")
    .order("created_at", { ascending: false });

  if (workflowEventsError) {
    throw new Error(`Could not load workflow events: ${workflowEventsError.message}`);
  }

  const ticketItems = tickets.map((ticket) => ({
    id: ticket.id,
    organization_id: ticket.organization_id,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    customer_name: ticket.conversations?.customers?.name ?? "Unnamed customer",
    customer_email: ticket.conversations?.customers?.email ?? null,
  }));

  const { data: knowledgeSources, error: knowledgeSourcesError } = await supabase
    .from("knowledge_sources")
    .select("id, organization_id, name, source_type, status, created_at, organizations(name)")
    .order("created_at", { ascending: false });

  if (knowledgeSourcesError) {
    throw new Error(`Could not load knowledge sources: ${knowledgeSourcesError.message}`);
  }

  const { data: knowledgeChunks, error: knowledgeChunksError } = await supabase
    .from("knowledge_chunks")
    .select("source_id, content")
    .order("created_at", { ascending: true });

  if (knowledgeChunksError) {
    throw new Error(`Could not load knowledge chunks: ${knowledgeChunksError.message}`);
  }

  const sourceItems = knowledgeSources.map((source) => ({
    id: source.id,
    organization_id: source.organization_id,
    organization_name: source.organizations?.name ?? "Unknown organization",
    name: source.name,
    source_type: source.source_type,
    status: source.status,
    content: knowledgeChunks.find((chunk) => chunk.source_id === source.id)?.content ?? "",
  }));

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-2xl bg-slate-950 px-6 py-5 text-white shadow-xl shadow-slate-900/10 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <Link className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300" href="/">
                OmniDesk AI
              </Link>
              <div className="mt-4 flex items-center gap-3">
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">Workspace live</span>
                <span className="text-sm text-slate-400">Support operations</span>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-200">{userData.user.email}</p>
                <p className="mt-1 text-xs text-slate-400">Signed in account</p>
              </div>
              <SignOutButton />
            </div>
          </div>
          <nav className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4 text-sm">
            <a className="rounded-lg bg-white/10 px-3 py-2 font-medium text-white" href="#overview">Overview</a>
            <a className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/10 hover:text-white" href="#inbox">Inbox</a>
            <a className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/10 hover:text-white" href="#knowledge">Knowledge</a>
            <a className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/10 hover:text-white" href="#automation">Automation</a>
          </nav>
        </header>

        <section id="overview" className="mt-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-600">Command center</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Support overview</h1>
            <p className="mt-2 text-slate-600">Monitor customer conversations, knowledge, and human handoffs from one workspace.</p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Organizations", organizations.length, "Active workspaces"],
              ["Conversations", conversations.length, "Stored customer threads"],
              ["Escalations", tickets.filter((ticket) => ticket.status !== "resolved" && ticket.status !== "cancelled").length, "Need human attention"],
              ["Knowledge sources", knowledgeSources.length, "Approved sources"],
            ].map(([label, value, description]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Workspace setup</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Your organizations</h2>
          </div>
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

        <section id="inbox" className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
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

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Human escalations</h2>
          <p className="mt-2 text-slate-600">Only conversations the AI could not answer appear here. FAQ-answered conversations stay in the Inbox and do not create tickets.</p>
          <TicketList tickets={ticketItems} />
        </section>

        <section id="automation" className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Automation events</h2>
          <p className="mt-2 text-slate-600">Escalation events waiting for n8n or another workflow worker.</p>
          <WorkflowEventList events={workflowEvents} />
        </section>

        <section id="knowledge" className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-950">Knowledge sources</h2>
          <p className="mt-2 text-slate-600">Add FAQs and documents that the AI will use for grounded answers.</p>
          <KnowledgeSourceList sources={sourceItems} />
          <CreateKnowledgeSourceForm organizations={organizations} />
        </section>
      </div>
    </main>
  );
}
