"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type KnowledgeSource = {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  source_type: string;
  status: string;
  content: string;
};

export default function KnowledgeSourceList({ sources }: { sources: KnowledgeSource[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function startEditing(source: KnowledgeSource) {
    setEditingId(source.id);
    setName(source.name);
    setContent(source.content);
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>, source: KnowledgeSource) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error: sourceError } = await supabase
        .from("knowledge_sources")
        .update({ name: name.trim(), status: "ready" })
        .eq("id", source.id)
        .eq("organization_id", source.organization_id);

      if (sourceError) {
        setMessage(sourceError.message);
        return;
      }

      const { error: chunkError } = await supabase
        .from("knowledge_chunks")
        .update({ content: content.trim() })
        .eq("source_id", source.id)
        .eq("organization_id", source.organization_id);

      if (chunkError) {
        setMessage(chunkError.message);
        return;
      }

      setEditingId(null);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function remove(source: KnowledgeSource) {
    if (!window.confirm(`Delete "${source.name}"?`)) {
      return;
    }

    setMessage("");
    const { error } = await createClient()
      .from("knowledge_sources")
      .delete()
      .eq("id", source.id)
      .eq("organization_id", source.organization_id);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <>
      {sources.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {sources.map((source) => (
            <li key={source.id} className="rounded-xl border border-slate-200 p-4">
              {editingId === source.id ? (
                <form className="space-y-3" onSubmit={(event) => save(event, source)}>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-amber-500 focus:ring-2"
                    required
                    maxLength={255}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                  <textarea
                    className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none ring-amber-500 focus:ring-2"
                    required
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                  />
                  <div className="flex gap-3">
                    <button className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Save"}
                    </button>
                    <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700" type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{source.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{source.organization_name} · {source.source_type}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">{source.status}</span>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-600">View content</summary>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{source.content}</p>
                  </details>
                  <div className="mt-3 flex gap-3">
                    <button className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-950" type="button" onClick={() => startEditing(source)}>
                      Edit
                    </button>
                    <button className="text-sm font-medium text-rose-700 underline underline-offset-4 hover:text-rose-900" type="button" onClick={() => remove(source)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-xl bg-slate-50 p-5 text-slate-600">No knowledge sources yet.</p>
      )}
      {message && <p className="mt-3 text-sm text-rose-700" role="alert">{message}</p>}
    </>
  );
}
