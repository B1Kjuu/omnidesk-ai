export type Tone = "go" | "notice" | "stop" | "active" | "idle";

type StatusEntry = { label: string; tone: Tone };

// One table decides how every status in the product reads, wherever it appears.
const statusTable = {
  conversation: {
    open: { label: "Open", tone: "active" },
    pending: { label: "Pending", tone: "idle" },
    resolved: { label: "Resolved", tone: "go" },
    escalated: { label: "With staff", tone: "notice" },
  },
  ticket: {
    open: { label: "Open", tone: "notice" },
    in_progress: { label: "In progress", tone: "active" },
    resolved: { label: "Resolved", tone: "go" },
    cancelled: { label: "Cancelled", tone: "idle" },
  },
  priority: {
    low: { label: "Low", tone: "idle" },
    normal: { label: "Normal", tone: "active" },
    high: { label: "High", tone: "notice" },
    urgent: { label: "Urgent", tone: "stop" },
  },
  knowledge: {
    pending: { label: "Pending", tone: "idle" },
    processing: { label: "Processing", tone: "active" },
    ready: { label: "Ready", tone: "go" },
    failed: { label: "Failed", tone: "stop" },
  },
  workflow: {
    pending: { label: "Queued", tone: "idle" },
    processing: { label: "Sending", tone: "active" },
    completed: { label: "Delivered", tone: "go" },
    failed: { label: "Failed", tone: "stop" },
  },
  reply: {
    answered: { label: "Answered", tone: "go" },
    staff: { label: "With staff", tone: "notice" },
    checking: { label: "Checking knowledge", tone: "idle" },
    failed: { label: "Not sent", tone: "stop" },
  },
} satisfies Record<string, Record<string, StatusEntry>>;

export type StatusDomain = keyof typeof statusTable;

export function getStatus(domain: StatusDomain, value: string): StatusEntry {
  const entries: Record<string, StatusEntry> = statusTable[domain];
  return entries[value] ?? { label: value.replaceAll("_", " "), tone: "idle" };
}

export function getOptions(domain: StatusDomain) {
  return Object.entries(statusTable[domain]).map(([value, entry]) => ({ value, label: entry.label }));
}

export const toneClasses: Record<Tone, string> = {
  go: "bg-go-wash text-go",
  notice: "bg-notice text-ink",
  stop: "bg-signal text-white",
  active: "bg-ink text-white",
  idle: "bg-platform text-ink-2",
};

// The same tones rendered as text on the black departure board.
export const boardToneClasses: Record<Tone, string> = {
  go: "text-go-bright",
  notice: "bg-notice text-ink",
  stop: "text-[#ff8a80]",
  active: "text-board-ink",
  idle: "text-board-ink-2",
};

// The same tones rendered as a reply footnote on paper.
export const replyToneClasses: Record<Tone, string> = {
  go: "text-go",
  notice: "bg-notice text-ink",
  stop: "text-signal-deep",
  active: "text-ink",
  idle: "text-ink-2",
};
