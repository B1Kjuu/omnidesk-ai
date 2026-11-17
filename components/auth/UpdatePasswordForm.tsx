"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setIsSaving(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) {
        setError(
          updateError.name === "AuthSessionMissingError"
            ? "This reset link has expired. Request a new one from the sign-in page."
            : updateError.message,
        );
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("The sign-in service could not be reached. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="border border-rule bg-paper p-6 shadow-[0_1px_2px_rgba(21,23,26,0.06),0_8px_24px_rgba(21,23,26,0.06)] sm:p-8">
      <h1 className="text-2xl font-bold tracking-[-0.01em]">Choose a new password</h1>
      <p className="mt-2 text-[0.9375rem]/relaxed text-ink-2">You opened a reset link from your email. Set a new password to get back to your desk.</p>
      <form className="mt-6 space-y-5" onSubmit={submit}>
        <div>
          <label className="field-label" htmlFor="new-password">New password</label>
          <input id="new-password" className="field mt-1.5" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="new-password-hint" />
          <p id="new-password-hint" className="field-hint">At least 6 characters.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="confirm-password">Type it again</label>
          <input id="confirm-password" className="field mt-1.5" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </div>
        {error && (
          <p className="alert-error" role="alert">
            {error}{" "}
            {error.includes("expired") && <Link href="/auth?mode=reset" className="font-bold underline">Request a new link</Link>}
          </p>
        )}
        <button className="btn btn-primary w-full py-3 text-base" type="submit" disabled={isSaving}>
          {isSaving ? "Saving" : "Save password and sign in"}
        </button>
      </form>
    </div>
  );
}
