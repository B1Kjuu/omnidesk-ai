import Link from "next/link";
import { connection } from "next/server";
import AcceptInvitationButton from "@/components/auth/AcceptInvitationButton";
import Wordmark from "@/components/ui/Wordmark";
import { hashSecretToken } from "@/lib/server/secretToken";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Join a team · OmniDesk AI", robots: { index: false } };

const roleText: Record<string, string> = {
  admin: "an admin: answer customers, manage knowledge, and change settings",
  agent: "an agent: answer customers and handle escalations",
};

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  await connection();
  const { token } = await params;
  const valid = /^[A-Za-z0-9_-]{20,100}$/.test(token);
  const { data } = valid ? await createAdminClient().rpc("get_invitation", { invitation_token_hash: hashSecretToken(token) }) : { data: null };
  const invitation = data?.[0] ?? null;

  const { data: claims } = await (await createClient()).auth.getClaims();
  const signedInEmail = typeof claims?.claims.email === "string" ? claims.claims.email : null;
  const next = encodeURIComponent(`/invite/${token}`);

  let body: React.ReactNode;
  if (!invitation) {
    body = <p className="text-ink-2">This invitation link is not valid. Ask the person who invited you for a new one.</p>;
  } else if (invitation.accepted) {
    body = (
      <p className="text-ink-2">
        This invitation was already used. <Link href="/dashboard" className="font-bold underline">Open your desk</Link>.
      </p>
    );
  } else if (invitation.expired) {
    body = <p className="text-ink-2">This invitation has expired. Ask the person who invited you to send a new one.</p>;
  } else if (!signedInEmail) {
    body = (
      <>
        <p className="text-ink-2">Sign in or create an account with <span className="font-bold text-ink">{invitation.email}</span> to join.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/auth?mode=sign-up&next=${next}&email=${encodeURIComponent(invitation.email)}`} className="btn btn-primary px-6 py-3 no-underline">
            Create an account
          </Link>
          <Link href={`/auth?next=${next}&email=${encodeURIComponent(invitation.email)}`} className="btn btn-secondary px-6 py-3 no-underline">
            I already have one
          </Link>
        </div>
      </>
    );
  } else if (signedInEmail.toLowerCase() !== invitation.email.toLowerCase()) {
    body = (
      <p className="alert-error">
        You are signed in as {signedInEmail}, but this invitation is for {invitation.email}. Sign out, then open this link again and sign in with {invitation.email}.
      </p>
    );
  } else {
    body = <AcceptInvitationButton token={token} organizationName={invitation.organization_name} />;
  }

  return (
    <main className="flex flex-1 flex-col bg-platform">
      <header className="bg-signal">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-10">
          <Wordmark />
        </div>
      </header>
      <div className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center sm:py-16">
        <div className="w-full max-w-md border border-rule bg-paper p-6 shadow-[0_1px_2px_rgba(21,23,26,0.06),0_8px_24px_rgba(21,23,26,0.06)] sm:p-8">
          <h1 className="text-2xl font-bold tracking-[-0.01em]">
            {invitation ? `Join ${invitation.organization_name}` : "Invitation not found"}
          </h1>
          {invitation && !invitation.accepted && !invitation.expired && (
            <p className="mt-2 text-[0.9375rem]/relaxed text-ink-2">You are invited as {roleText[invitation.role] ?? invitation.role}.</p>
          )}
          <div className="mt-5 text-[0.9375rem]/relaxed">{body}</div>
        </div>
      </div>
    </main>
  );
}
