"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const { error } = await createClient().auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    router.push("/auth");
    router.refresh();
  }

  return (
    <button className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-950" type="button" onClick={signOut}>
      Sign out
    </button>
  );
}
