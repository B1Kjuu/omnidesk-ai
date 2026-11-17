"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "sign-up";

const copy: Record<Mode, { title: string; lead: string; submit: string; busy: string }> = {
  "sign-in": {
    title: "Sign in to your desk",
    lead: "Manage knowledge, answer escalations, and watch automation for your organizations.",
    submit: "Sign in",
    busy: "Signing in",
  },
  "sign-up": {
    title: "Create your account",
    lead: "You will create your first organization right after signing in.",
    submit: "Create account",
    busy: "Creating account",
  },
};

export default function AuthForm({ initialMode = "sign-in", initialNotice = "" }: { initialMode?: Mode; initialNotice?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState(initialNotice);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (mode === "sign-up" && !result.data.session) {
        setMode("sign-in");
        setNotice(`Check ${email} for a confirmation link, then sign in here.`);
        return;
      }

      router.push("/dashboard");
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

      <div className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-[-0.01em]">{text.title}</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2">{text.lead}</p>

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
          <div>
            <label className="field-label" htmlFor="auth-password">Password</label>
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

          {notice && <p className="alert-info" role="status">{notice}</p>}
          {error && <p className="alert-error" role="alert">{error}</p>}

          <button className="btn btn-primary w-full py-3 text-base" type="submit" disabled={isSubmitting}>
            {isSubmitting ? text.busy : text.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
