"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await createClient().rpc("create_organization", {
        organization_name: name.trim(),
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

  return (
    <form className="mt-6 flex max-w-lg flex-col gap-3 sm:flex-row" onSubmit={submit}>
      <label className="sr-only" htmlFor="organization-name">Organization name</label>
      <input
        id="organization-name"
        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-amber-500 focus:ring-2"
        placeholder="Organization name"
        required
        maxLength={120}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button
        className="rounded-lg bg-slate-950 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Create organization"}
      </button>
      {message && <p className="basis-full text-sm text-rose-700" role="alert">{message}</p>}
    </form>
  );
}
