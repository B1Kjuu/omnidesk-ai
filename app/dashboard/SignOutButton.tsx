"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setError("");
    setIsSigningOut(true);
    const { error: signOutError } = await createClient().auth.signOut();
    if (signOutError) {
      setError(`Sign out failed: ${signOutError.message}`);
      setIsSigningOut(false);
      return;
    }
    router.push("/auth");
    router.refresh();
  }

  return (
    <div className="relative">
      <button className="btn border border-white/70 px-3 py-1.5 text-sm text-white hover:bg-white hover:text-signal" type="button" onClick={signOut} disabled={isSigningOut}>
        {isSigningOut ? "Signing out" : "Sign out"}
      </button>
      {error && (
        <p className="absolute top-full right-0 z-10 mt-2 w-60 border border-signal bg-paper p-2 text-xs text-signal-deep shadow-[0_4px_12px_rgba(21,23,26,0.12)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
