"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/ui/Icon";

export type NavCounts = {
  inbox: number;
  escalations: number;
  knowledge: number;
  automationFailures: number;
  organizations: number;
};

const items: Array<{ href: string; label: string; icon: IconName; count?: (counts: NavCounts) => number | undefined; alert?: (counts: NavCounts) => boolean }> = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/dashboard/inbox", label: "Inbox", icon: "inbox", count: (c) => c.inbox },
  { href: "/dashboard/escalations", label: "Escalations", icon: "person", count: (c) => c.escalations, alert: (c) => c.escalations > 0 },
  { href: "/dashboard/knowledge", label: "Knowledge", icon: "book", count: (c) => c.knowledge },
  { href: "/dashboard/insights", label: "Insights", icon: "chart" },
  { href: "/dashboard/automation", label: "Automation", icon: "bolt", count: (c) => c.automationFailures || undefined, alert: (c) => c.automationFailures > 0 },
  { href: "/dashboard/organizations", label: "Organizations", icon: "building", count: (c) => c.organizations },
  { href: "/dashboard/team", label: "Team", icon: "person" },
  { href: "/dashboard/activity", label: "Activity", icon: "flag" },
];

export default function DeskNav({ counts }: { counts: NavCounts | null }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Desk sections" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((item) => {
          const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
          const count = counts && item.count ? item.count(counts) : undefined;
          const alert = counts && item.alert ? item.alert(counts) : false;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-[2px] px-3 py-2.5 text-[0.9375rem] font-bold whitespace-nowrap no-underline transition-colors duration-150 ${
                  active ? "bg-ink text-white" : "text-ink hover:bg-paper"
                }`}
              >
                <Icon name={item.icon} className={`size-4 ${active ? "text-white" : "text-ink-2"}`} />
                <span className="flex-1">{item.label}</span>
                {count !== undefined && (
                  <span
                    className={`min-w-6 rounded-[2px] px-1.5 text-center font-mono text-xs/5 ${
                      alert ? "bg-notice text-ink" : active ? "bg-white/15 text-white" : "bg-paper text-ink-2"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
