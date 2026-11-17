"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function AuthForm({ initialMessage = "" }: { initialMessage?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (mode === "sign-up" && !result.data.session) {
        setMessage("Account created. Check your email to confirm the account, then sign in.");
        setMode("sign-in");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">OmniDesk AI</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          {mode === "sign-in" ? "Welcome back" : "Create your account"}
        </h1>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-amber-500 focus:ring-2"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-amber-500 focus:ring-2"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {message && <p className="text-sm text-rose-700" role="alert">{message}</p>}
        <button
          className="w-full rounded-lg bg-slate-950 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-950"
        type="button"
        onClick={() => {
          setMessage("");
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
        }}
      >
        {mode === "sign-in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
