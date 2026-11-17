import { Suspense } from "react";
import DeskNav from "@/components/dashboard/DeskNav";
import LiveRefresh from "@/components/dashboard/LiveRefresh";
import Wordmark from "@/components/ui/Wordmark";
import { getDesk } from "@/lib/dashboard/getDesk";
import SignOutButton from "./SignOutButton";

export const instant = false;

async function Account() {
  const desk = await getDesk();
  return <p className="hidden text-sm text-white/90 sm:block">{desk.email}</p>;
}

async function NavWithCounts() {
  const desk = await getDesk();
  return (
    <DeskNav
      counts={{
        inbox: desk.conversations.length,
        escalations: desk.openTickets.length,
        knowledge: desk.sources.length,
        automationFailures: desk.failedEvents.length,
        organizations: desk.organizations.length,
      }}
    />
  );
}

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col bg-platform">
      <LiveRefresh />
      <header className="bg-signal">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Wordmark href="/dashboard" />
          <div className="flex items-center gap-4">
            <Suspense fallback={null}>
              <Account />
            </Suspense>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12 lg:py-10">
        <div className="mb-8 lg:mb-0">
          <div className="lg:sticky lg:top-8">
            <Suspense fallback={<DeskNav counts={null} />}>
              <NavWithCounts />
            </Suspense>
          </div>
        </div>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
