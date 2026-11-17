"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import StatusTag from "@/components/ui/StatusTag";
import { createClient } from "@/lib/supabase/browser";
import { EmptyState } from "./SectionHeader";

type KnowledgeSource = {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  source_type: string;
  status: string;
  content: string;
};

const typeLabel: Record<string, string> = { faq: "FAQ", text: "Text", pdf: "PDF" };

export default function KnowledgeSourceList({ sources, showOrganization }: { sources: KnowledgeSource[]; showOrganization: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function startEditing(source: KnowledgeSource) {
    setEditingId(source.id);
    setName(source.name);
    setContent(source.content);
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>, source: KnowledgeSource) {
    event.preventDefault();
    setError("");
    setBusyId(source.id);

    try {
      const supabase = createClient();
      const { error: sourceError } = await supabase
        .from("knowledge_sources")
        .update({ name: name.trim(), status: "ready" })
        .eq("id", source.id)
        .eq("organization_id", source.organization_id);

      if (sourceError) {
        setError(`"${source.name}" could not be saved: ${sourceError.message}`);
        return;
      }

      const { error: chunkError } = await supabase
        .from("knowledge_chunks")
        .update({ content: content.trim() })
        .eq("source_id", source.id)
        .eq("organization_id", source.organization_id);

      if (chunkError) {
        setError(`The content of "${source.name}" could not be saved: ${chunkError.message}`);
        return;
      }

      setEditingId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(source: KnowledgeSource) {
    if (!window.confirm(`Delete "${source.name}"? Customers will no longer get answers from it.`)) {
      return;
    }

    setError("");
    setBusyId(source.id);
    const { error: deleteError } = await createClient()
      .from("knowledge_sources")
      .delete()
      .eq("id", source.id)
      .eq("organization_id", source.organization_id);
    setBusyId(null);

    if (deleteError) {
      setError(`"${source.name}" could not be deleted: ${deleteError.message}`);
      return;
    }

    router.refresh();
  }

  if (sources.length === 0) {
    return (
      <EmptyState title="No approved knowledge yet">
        Add your first FAQ with the form. Until then, every customer question is handed to staff.
      </EmptyState>
    );
  }

  return (
    <>
      {error && <p className="alert-error mt-4" role="alert">{error}</p>}
      <ul>
        {sources.map((source) => (
          <li key={source.id} className="border-b border-rule py-4 last:border-b-0">
            {editingId === source.id ? (
              <form className="space-y-3" onSubmit={(event) => save(event, source)}>
                <div>
                  <label className="field-label" htmlFor={`edit-name-${source.id}`}>Title</label>
                  <input id={`edit-name-${source.id}`} className="field mt-1.5" required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div>
                  <label className="field-label" htmlFor={`edit-content-${source.id}`}>Approved answer</label>
                  <textarea id={`edit-content-${source.id}`} className="field mt-1.5 min-h-36 resize-y" required value={content} onChange={(event) => setContent(event.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={busyId === source.id}>
                    {busyId === source.id ? "Saving" : "Save changes"}
                  </button>
                  <button className="btn btn-quiet" type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{source.name}</p>
                    <p className="mt-0.5 text-sm text-ink-2">
                      {typeLabel[source.source_type] ?? source.source_type}
                      {showOrganization && <> · {source.organization_name}</>}
                    </p>
                  </div>
                  <StatusTag domain="knowledge" value={source.status} />
                </div>
                <p className="mt-2 line-clamp-2 max-w-[75ch] text-[0.9375rem] leading-relaxed text-ink-2">{source.content || "No content"}</p>
                <div className="mt-2 -ml-2 flex gap-1">
                  <button className="btn btn-quiet py-1.5 text-sm" type="button" onClick={() => startEditing(source)}>
                    Edit
                  </button>
                  <button className="btn btn-danger py-1.5 text-sm" type="button" disabled={busyId === source.id} onClick={() => remove(source)}>
                    {busyId === source.id ? "Deleting" : "Delete"}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
