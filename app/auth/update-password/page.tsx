import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import Wordmark from "@/components/ui/Wordmark";

export const metadata = { title: "Choose a new password", robots: { index: false } };

export default function UpdatePasswordPage() {
  return (
    <main className="flex flex-1 flex-col bg-platform">
      <header className="bg-signal">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-10">
          <Wordmark />
        </div>
      </header>
      <div className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center sm:py-16">
        <div className="w-full max-w-md">
          <UpdatePasswordForm />
        </div>
      </div>
    </main>
  );
}
