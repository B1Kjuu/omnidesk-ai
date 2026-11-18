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
  source_url: string | null;
  last_error: string | null;
  chunk_count: number;
};

const typeLabel: Record<string, string> = { faq: "FAQ", text: "Text", pdf: "PDF", url: "Website" };

/** Edits and retries go through /api/knowledge/[id], which re-embeds the passages on the server. */
async function patchSource(id: string, body: { name?: string; content?: string; refetch?: boolean }) {
  try {
    const response = await fetch(`/api/knowledge/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    return response.ok ? null : result.error ?? "The source could not be updated.";
  } catch {
    return "The server could not be reached. Check your connection and try again.";
  }
}

export default function KnowledgeSourceList({
  sources,
  showOrganization,
  manageableOrganizationIds,
}: {
  sources: KnowledgeSource[];
  showOrganization: boolean;
  /** Organizations where the user is an owner or admin; agents get a read-only list. */
  manageableOrganizationIds: string[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<{ id: string; action: string } | null>(null);

  function startEditing(source: KnowledgeSource) {
    setEditingId(source.id);
    setName(source.name);
    setContent(source.content);
    setError("");
  }

  async function run(source: KnowledgeSource, action: string, body: Parameters<typeof patchSource>[1]) {
    setError("");
    setBusy({ id: source.id, action });
    const failure = await patchSource(source.id, body);
    setBusy(null);
    if (failure) {
      setError(`"${source.name}": ${failure}`);
      router.refresh();
      return false;
    }
    router.refresh();
    return true;
  }

  async function save(event: FormEvent<HTMLFormElement>, source: KnowledgeSource) {
    event.preventDefault();
    if (await run(source, "save", { name: name.trim(), content: content.trim() })) setEditingId(null);
  }

  async function remove(source: KnowledgeSource) {
    if (!window.confirm(`Delete "${source.name}"? Customers will no longer get answers from it.`)) return;

    setError("");
    setBusy({ id: source.id, action: "delete" });
    // Passages are removed with the source (foreign key cascade). RLS limits deletes to admins.
    const { error: deleteError } = await createClient().from("knowledge_sources").delete().eq("id", source.id).eq("organization_id", source.organization_id);
    setBusy(null);

    if (deleteError) {
      setError(`"${source.name}" could not be deleted: ${deleteError.message}`);
      return;
    }
    router.refresh();
  }

  if (sources.length === 0) {
    return (
      <EmptyState title="No approved knowledge yet">
        Add your first FAQ, PDF, or web page with the form. Until then, every customer question is handed to staff.
      </EmptyState>
    );
  }

  const isBusy = (id: string, action?: string) => busy?.id === id && (!action || busy.action === action);

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
                  <label className="field-label" htmlFor={`edit-content-${source.id}`}>Approved text</label>
                  <textarea id={`edit-content-${source.id}`} className="field mt-1.5 min-h-44 resize-y" required maxLength={100_000} value={content} onChange={(event) => setContent(event.target.value)} />
                  {(source.source_type === "pdf" || source.source_type === "url") && (
                    <p className="field-hint">This is the text read from the {source.source_type === "pdf" ? "PDF" : "page"}. Edit it to correct or trim what customers are answered from.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={isBusy(source.id)}>
                    {isBusy(source.id, "save") ? "Saving and re-indexing" : "Save changes"}
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
                      {source.status === "ready" && source.chunk_count > 0 && <> · {source.chunk_count} {source.chunk_count === 1 ? "passage" : "passages"}</>}
                      {showOrganization && <> · {source.organization_name}</>}
                    </p>
                    {source.source_url && (
                      <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-sm text-ink-2 underline">
                        {source.source_url}
                      </a>
                    )}
                  </div>
                  <StatusTag domain="knowledge" value={source.status} />
                </div>
                {source.status === "failed" && source.last_error && (
                  <p className="alert-error mt-2 text-sm" role="status">{source.last_error}</p>
                )}
                <p className="mt-2 line-clamp-2 max-w-[75ch] text-[0.9375rem]/relaxed text-ink-2">{source.content || "No content"}</p>
                {manageableOrganizationIds.includes(source.organization_id) && (
                <div className="mt-2 -ml-2 flex flex-wrap gap-1">
                  {source.status === "failed" && (
                    <button className="btn btn-secondary py-1.5 text-sm" type="button" disabled={isBusy(source.id)} onClick={() => run(source, "retry", {})}>
                      {isBusy(source.id, "retry") ? "Retrying" : "Retry"}
                    </button>
                  )}
                  <button className="btn btn-quiet py-1.5 text-sm" type="button" disabled={isBusy(source.id)} onClick={() => startEditing(source)}>
                    Edit
                  </button>
                  {source.source_type === "url" && source.source_url && (
                    <button className="btn btn-quiet py-1.5 text-sm" type="button" disabled={isBusy(source.id)} onClick={() => run(source, "refetch", { refetch: true })}>
                      {isBusy(source.id, "refetch") ? "Refreshing" : "Refresh from page"}
                    </button>
                  )}
                  <button className="btn btn-danger py-1.5 text-sm" type="button" disabled={isBusy(source.id)} onClick={() => remove(source)}>
                    {isBusy(source.id, "delete") ? "Deleting" : "Delete"}
                  </button>
                </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
