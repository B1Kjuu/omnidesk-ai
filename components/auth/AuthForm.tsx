"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export type AuthMode = "sign-in" | "sign-up" | "reset";

const copy: Record<AuthMode, { title: string; lead: string; submit: string; busy: string }> = {
  "sign-in": {
    title: "Sign in to your desk",
    lead: "Manage knowledge, answer escalations, and watch automation for your organizations.",
    submit: "Sign in",
    busy: "Signing in",
  },
  "sign-up": {
    title: "Create your account",
    lead: "We will email you a confirmation link. You create your first organization right after.",
    submit: "Create account",
    busy: "Creating account",
  },
  reset: {
    title: "Reset your password",
    lead: "Enter the email you signed up with and we will send you a link to choose a new password.",
    submit: "Email me a reset link",
    busy: "Sending link",
  },
};

/** Where Supabase email links land; must be listed under Auth → URL Configuration → Redirect URLs. */
const confirmUrl = (next: string) => `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;

/** `next` is a same-site path to return to after signing in (e.g. an invitation link). */
export default function AuthForm({
  initialMode = "sign-in",
  initialNotice = "",
  next = "/dashboard",
  initialEmail = "",
}: {
  initialMode?: AuthMode;
  initialNotice?: string;
  next?: string;
  initialEmail?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState(initialNotice);
  const [error, setError] = useState("");
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
    setNotice("");
    setUnconfirmed(false);
  }

  async function resendConfirmation() {
    setError("");
    setIsSubmitting(true);
    try {
      const { error: resendError } = await createClient().auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: confirmUrl(next) },
      });
      if (resendError) {
        setError(resendError.message);
        return;
      }
      setUnconfirmed(false);
      setNotice(`A new confirmation link is on its way to ${email}.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setUnconfirmed(false);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: confirmUrl("/auth/update-password") });
        if (resetError) {
          setError(resetError.message);
          return;
        }
        // Same message whether or not the account exists, so the form cannot be used to probe for accounts.
        setNotice(`If ${email} has an account, a reset link is on its way. It works once and expires in an hour.`);
        return;
      }

      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: confirmUrl(next) } });

      if (result.error) {
        if (result.error.code === "email_not_confirmed") {
          setUnconfirmed(true);
          setError(`${email} is not confirmed yet. Open the link we emailed you, or send a new one.`);
        } else {
          setError(result.error.message);
        }
        return;
      }

      if (mode === "sign-up" && !result.data.session) {
        setMode("sign-in");
        setNotice(`Check ${email} for a confirmation link. Opening it signs you in.`);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("The sign-in service could not be reached. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const text = copy[mode];

  return (
    <div className="border border-rule bg-paper shadow-[0_1px_2px_rgba(21,23,26,0.06),0_8px_24px_rgba(21,23,26,0.06)]">
      {mode !== "reset" && (
        <div className="grid grid-cols-2 border-b border-rule" role="group" aria-label="Choose sign in or create account">
          {(["sign-in", "sign-up"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={mode === option}
              onClick={() => switchMode(option)}
              className={`-mb-px border-b-2 px-4 py-3.5 text-[0.9375rem] font-bold transition-colors ${
                mode === option ? "border-signal text-ink" : "border-transparent text-ink-2 hover:bg-platform hover:text-ink"
              }`}
            >
              {option === "sign-in" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      )}

      <div className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-[-0.01em]">{text.title}</h1>
        <p className="mt-2 text-[0.9375rem]/relaxed text-ink-2">{text.lead}</p>

        <form className="mt-6 space-y-5" onSubmit={submit}>
          <div>
            <label className="field-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="field mt-1.5"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          {mode !== "reset" && (
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label className="field-label" htmlFor="auth-password">Password</label>
                {mode === "sign-in" && (
                  <button type="button" className="text-sm font-bold text-ink-2 underline hover:text-ink" onClick={() => switchMode("reset")}>
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                className="field mt-1.5"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={mode === "sign-up" ? "auth-password-hint" : undefined}
              />
              {mode === "sign-up" && <p id="auth-password-hint" className="field-hint">At least 6 characters.</p>}
            </div>
          )}

          {notice && <p className="alert-info" role="status">{notice}</p>}
          {error && (
            <div className="alert-error" role="alert">
              <p>{error}</p>
              {unconfirmed && (
                <button type="button" className="mt-2 font-bold underline" onClick={resendConfirmation} disabled={isSubmitting}>
                  Send a new confirmation link
                </button>
              )}
            </div>
          )}

          <button className="btn btn-primary w-full py-3 text-base" type="submit" disabled={isSubmitting}>
            {isSubmitting ? text.busy : text.submit}
          </button>

          {mode === "reset" && (
            <button type="button" className="btn btn-quiet w-full" onClick={() => switchMode("sign-in")}>
              Back to sign in
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
