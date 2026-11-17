import AuthForm from "@/components/auth/AuthForm";
import Wordmark from "@/components/ui/Wordmark";

export const instant = false;

const notices: Record<string, string> = {
  "session-expired": "Your session expired. Sign in again to return to your desk.",
  "link-invalid": "That email link is invalid, expired, or already used. Sign in, or ask for a new link.",
};

type AuthPageProps = {
  searchParams: Promise<{ reason?: string; mode?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { reason, mode } = await searchParams;

  return (
    <main className="flex flex-1 flex-col bg-platform">
      <header className="bg-signal">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-10">
          <Wordmark />
        </div>
      </header>

      <div className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center sm:py-16">
        <div className="w-full max-w-md">
          <AuthForm
            initialMode={mode === "sign-up" || mode === "reset" ? mode : "sign-in"}
            initialNotice={notices[reason ?? ""] ?? ""}
          />
          <p className="mt-6 text-center text-sm/relaxed text-ink-2">
            Customers never need an account. They ask questions on your desk&apos;s public chat page.
          </p>
        </div>
      </div>
    </main>
  );
}
