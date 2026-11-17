"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Props = {
  organizationId: string;
  /** The address set explicitly for this organization, or null when it falls back to the creator. */
  configured: string | null;
  /** Who is emailed right now. */
  effective: string | null;
};

export default function NotificationEmailForm({ organizationId, configured, effective }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(configured ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputId = `notify-${organizationId}`;

  async function save(next: string | null) {
    setError("");
    setSaved("");
    setIsSaving(true);
    try {
      // RLS only lets owners and admins update an organization; agents get a permission error here.
      const { error: updateError } = await createClient().from("organizations").update({ notification_email: next }).eq("id", organizationId);
      if (updateError) {
        setError(
          updateError.code === "42703"
            ? "The database is missing the notification setting. Apply the latest migration, then try again."
            : `The address could not be saved: ${updateError.message}`,
        );
        return;
      }
      setSaved(next ? `Escalations now go to ${next}.` : "Escalations now go to the organization creator.");
      if (!next) setValue("");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = value.trim();
    void save(next === "" ? null : next);
  }

  return (
    <form className="mt-4 border-t border-dashed border-rule-strong pt-4" onSubmit={submit}>
      <label className="field-label" htmlFor={inputId}>Escalation emails go to</label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          className="field min-w-0 flex-1"
          type="email"
          maxLength={320}
          placeholder={effective ?? "team@example.com"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby={`${inputId}-hint`}
        />
        <button className="btn btn-secondary" type="submit" disabled={isSaving || value.trim() === (configured ?? "")}>
          {isSaving ? "Saving" : "Save address"}
        </button>
      </div>
      <p id={`${inputId}-hint`} className="field-hint">
        {configured
          ? "A shared inbox works well, for example support@yourcompany.com."
          : `Currently ${effective ?? "the organization creator"} (the creator's sign-in email). Set a shared inbox to send them elsewhere.`}
        {configured && (
          <>
            {" "}
            <button type="button" className="font-bold text-ink underline" onClick={() => void save(null)} disabled={isSaving}>
              Use the creator&apos;s email instead
            </button>
          </>
        )}
      </p>
      {saved && <p className="mt-3 alert-info" role="status">{saved}</p>}
      {error && <p className="mt-3 alert-error" role="alert">{error}</p>}
    </form>
  );
}
