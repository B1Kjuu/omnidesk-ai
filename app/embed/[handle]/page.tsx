import type { CSSProperties } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import ChatForm from "@/components/chat/ChatForm";
import WidgetCloseButton from "@/components/chat/WidgetCloseButton";
import { findChatOrganization } from "@/lib/chatOrganization";

export const instant = false;

export const metadata = { robots: { index: false } };

/**
 * The chat as it appears inside the website widget (public/widget.js loads this in an iframe).
 * Which sites may frame it is enforced by the Content-Security-Policy frame-ancestors header set in proxy.ts.
 */
export default async function EmbeddedChatPage({ params, searchParams }: PageProps<"/embed/[handle]">) {
  await connection();
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const organization = await findChatOrganization(handle);
  if (!organization) notFound();

  // Optional brand colour from the embed snippet (data-color), applied by overriding the signal token.
  const accent = typeof query.accent === "string" && /^[0-9a-f]{6}$/i.test(query.accent) ? `#${query.accent}` : null;
  const style = accent ? ({ "--color-signal": accent, "--color-signal-deep": accent } as CSSProperties) : undefined;

  return (
    <main className="flex h-dvh flex-col bg-platform" style={style}>
      <header className="flex shrink-0 items-center justify-between gap-3 bg-signal px-4 py-3 text-white">
        <div className="min-w-0">
          <h1 className="truncate text-lg/tight font-bold">{organization.name}</h1>
          <p className="text-sm text-white/90">Answers from our help articles, or a person</p>
        </div>
        <WidgetCloseButton />
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5">
        <ChatForm organizationId={organization.id} organizationName={organization.name} compact />
      </div>

      <footer className="shrink-0 border-t border-rule bg-paper px-4 py-2 text-center text-xs text-ink-2">
        Powered by{" "}
        <a href="/" target="_blank" rel="noopener" className="font-bold underline">OmniDesk AI</a>
      </footer>
    </main>
  );
}
