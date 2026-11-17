export type DeskReply = {
  answer: string;
  escalated: boolean;
  sources: string[];
  /** The approved passage behind the answer, quoted so the customer can check it. */
  citations: Array<{ source: string; quote: string; url: string | null }>;
};

type AskInput = {
  organizationId: string;
  name: string;
  email?: string;
  message: string;
  turnstileToken?: string;
};

export async function askDesk(input: AskInput): Promise<{ ok: true; reply: DeskReply } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...input, email: input.email ?? "" }),
    });
  } catch {
    return { ok: false, error: "The support service could not be reached. Check your connection and try again." };
  }

  let result: { answer?: string; escalated?: boolean; sources?: string[]; citations?: DeskReply["citations"]; error?: string };
  try {
    result = await response.json();
  } catch {
    return { ok: false, error: "The support service sent an unreadable reply. Try again in a moment." };
  }

  if (!response.ok || typeof result.answer !== "string") {
    return { ok: false, error: result.error ?? "Your question could not be sent. Try again in a moment." };
  }

  return {
    ok: true,
    reply: {
      answer: result.answer,
      escalated: result.escalated === true,
      sources: Array.isArray(result.sources) ? result.sources : [],
      citations: Array.isArray(result.citations) ? result.citations : [],
    },
  };
}

export function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
