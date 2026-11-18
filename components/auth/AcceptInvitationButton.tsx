"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInvitationButton({ token, organizationName }: { token: string; organizationName: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  async function accept() {
    setError("");
    setIsJoining(true);
    try {
      const response = await fetch("/api/team/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "The invitation could not be accepted.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("The server could not be reached. Check your connection and try again.");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-primary w-full py-3 text-base" onClick={accept} disabled={isJoining}>
        {isJoining ? "Joining" : `Join ${organizationName}`}
      </button>
      {error && <p className="mt-3 alert-error" role="alert">{error}</p>}
    </>
  );
}
