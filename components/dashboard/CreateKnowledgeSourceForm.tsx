"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Organization = {
  id: string;
  name: string;
};

export default function CreateKnowledgeSourceForm({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("faq");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        setMessage("Your session has expired. Please sign in again.");
        return;
      }

      const { error } = await supabase.from("knowledge_sources").insert({
        organization_id: organizationId,
        name: name.trim(),
        source_type: sourceType,
        created_by: userData.user.id,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setName("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (organizations.length === 0) {
    return null;
  }

  return (
    <form className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]" onSubmit={submit}>
      <label className="sr-only" htmlFor="knowledge-source-name">Knowledge source name</label>
      <input
        id="knowledge-source-name"
        className="min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-amber-500 focus:ring-2"
        placeholder="Source name, e.g. Refund FAQ"
        required
        maxLength={255}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <label className="sr-only" htmlFor="knowledge-source-organization">Organization</label>
      <select
        id="knowledge-source-organization"
        className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-amber-500 focus:ring-2"
        value={organizationId}
        onChange={(event) => setOrganizationId(event.target.value)}
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>{organization.name}</option>
        ))}
      </select>
      <label className="sr-only" htmlFor="knowledge-source-type">Source type</label>
      <select
        id="knowledge-source-type"
        className="rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-amber-500 focus:ring-2"
        value={sourceType}
        onChange={(event) => setSourceType(event.target.value)}
      >
        <option value="faq">FAQ</option>
        <option value="text">Text</option>
        <option value="pdf">PDF</option>
      </select>
      <button
        className="rounded-lg bg-slate-950 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting || !organizationId}
      >
        {isSubmitting ? "Adding..." : "Add source"}
      </button>
      {message && <p className="text-sm text-rose-700 sm:col-span-4" role="alert">{message}</p>}
    </form>
  );
}
