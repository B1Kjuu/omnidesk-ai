"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/browser";

type Organization = Pick<Database["public"]["Tables"]["organizations"]["Row"], "id" | "name">;

export default function CreateConversationForm({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!organizationId) {
      setErrorMessage("Create an organization before adding a conversation.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await createClient().rpc("create_test_conversation", {
        target_organization_id: organizationId,
        customer_name: customerName,
        customer_email: customerEmail,
        first_message: message,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setCustomerName("");
      setCustomerEmail("");
      setMessage("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (organizations.length === 0) return null;

  return (
    <details className="mt-8 rounded-xl border border-dashed border-slate-300 p-5">
      <summary className="cursor-pointer font-medium text-slate-800">Create a local test conversation</summary>
      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="text-sm font-medium text-slate-700">
          Organization
          <select
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Customer name
          <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Customer email
          <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          First message
          <textarea className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2.5" required value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
        {errorMessage && <p className="text-sm text-rose-700 sm:col-span-2" role="alert">{errorMessage}</p>}
        <button className="rounded-lg bg-slate-950 px-4 py-2.5 font-medium text-white disabled:opacity-60 sm:col-span-2 sm:justify-self-start" type="submit"         disabled={isSubmitting || !organizationId}>
          {isSubmitting ? "Saving..." : "Save conversation"}
        </button>
      </form>
    </details>
  );
}
