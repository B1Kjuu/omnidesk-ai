"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function CreateOrganizationForm({ isFirst }: { isFirst: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { error: createError } = await createClient().rpc("create_organization", {
        organization_name: name.trim(),
      });

      if (createError) {
        setError(`The organization could not be created: ${createError.message}`);
        return;
      }

      setName("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="max-w-xl" onSubmit={submit}>
      <label className="field-label" htmlFor="organization-name">{isFirst ? "Organization name" : "Add another organization"}</label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input
          id="organization-name"
          className="field min-w-0 flex-1"
          placeholder="For example, Sunrise Outfitters"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating" : "Create organization"}
        </button>
      </div>
      {error && <p className="alert-error mt-3" role="alert">{error}</p>}
    </form>
  );
}
