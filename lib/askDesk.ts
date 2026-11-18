export type Citation = { source: string; quote: string; url: string | null };

export type DeskReply = {
  conversationId: string;
  /** Only returned when a conversation starts; the browser keeps it to come back to the thread. */
  conversationToken: string | null;
  answer: string;
  escalated: boolean;
  sources: string[];
  /** The approved passage behind the answer, quoted so the customer can check it. */
  citations: Citation[];
};

type AskInput = {
  organizationId: string;
  name: string;
  email?: string;
  message: string;
  turnstileToken?: string;
  /** Continue an existing conversation (both required together). */
  conversationId?: string;
  conversationToken?: string;
};

export async function askDesk(input: AskInput): Promise<{ ok: true; reply: DeskReply } | { ok: false; error: string; status?: number }> {
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

  let result: Partial<DeskReply> & { error?: string };
  try {
    result = await response.json();
  } catch {
    return { ok: false, error: "The support service sent an unreadable reply. Try again in a moment." };
  }

  if (!response.ok || typeof result.answer !== "string") {
    return { ok: false, error: result.error ?? "Your question could not be sent. Try again in a moment.", status: response.status };
  }

  return {
    ok: true,
    reply: {
      conversationId: result.conversationId ?? "",
      conversationToken: result.conversationToken ?? null,
      answer: result.answer,
      escalated: result.escalated === true,
      sources: Array.isArray(result.sources) ? result.sources : [],
      citations: Array.isArray(result.citations) ? result.citations : [],
    },
  };
}

export type ThreadMessage = {
  id: string;
  sender: "customer" | "assistant" | "agent";
  content: string;
  createdAt: string;
  grounded: boolean;
  citations: Citation[];
  /** The customer's own rating of this answer: 1 helpful, -1 not helpful. */
  rating: number | null;
};

export type Thread = {
  status: string;
  waitingForStaff: boolean;
  customer: { name: string; email: string | null };
  messages: ThreadMessage[];
};

/** Loads a returning customer's conversation. null when it no longer exists or the token is wrong. */
export async function fetchThread(conversationId: string, conversationToken: string): Promise<Thread | null | "unavailable"> {
  try {
    const response = await fetch("/api/chat/thread", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, conversationToken }),
    });
    if (response.status === 404) return null;
    if (!response.ok) return "unavailable";
    return (await response.json()) as Thread;
  } catch {
    return "unavailable";
  }
}

export async function saveContactEmail(conversationId: string, conversationToken: string, email: string): Promise<string | null> {
  try {
    const response = await fetch("/api/chat/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, conversationToken, email }),
    });
    if (response.ok) return null;
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    return result.error ?? "The email could not be saved.";
  } catch {
    return "The support service could not be reached.";
  }
}

export async function rateAnswer(conversationId: string, conversationToken: string, messageId: string, rating: 1 | -1) {
  try {
    const response = await fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, conversationToken, messageId, rating }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
