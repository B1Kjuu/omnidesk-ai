import AuthForm from "@/components/auth/AuthForm";

export const instant = false;

type AuthPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { reason } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <AuthForm initialMessage={reason === "session-expired" ? "Your session expired. Please sign in again." : ""} />
    </main>
  );
}
