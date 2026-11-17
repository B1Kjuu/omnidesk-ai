"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function SignOutButton() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function signOut() {
    setMessage("");
    const { error } = await createClient().auth.signOut();
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="text-right">
      <button className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-950" type="button" onClick={signOut}>
        Sign out
      </button>
      {message && <p className="mt-2 max-w-48 text-xs text-rose-700" role="alert">{message}</p>}
    </div>
  );
}
