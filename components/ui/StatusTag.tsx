import { getStatus, toneClasses, type StatusDomain } from "@/lib/status";

export default function StatusTag({ domain, value }: { domain: StatusDomain; value: string }) {
  const status = getStatus(domain, value);

  return (
    <span className={`inline-flex items-center rounded-[2px] px-2 py-0.5 text-xs font-bold whitespace-nowrap ${toneClasses[status.tone]}`}>
      {status.label}
    </span>
  );
}
