"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Organization = { id: string; name: string };
type SourceType = "faq" | "text" | "pdf" | "url";

const TYPES: Array<{ value: SourceType; label: string; hint: string }> = [
  { value: "faq", label: "FAQ", hint: "One question per block. Start each with Q: and its answer with A:." },
  { value: "text", label: "Text", hint: "Policies or guides. Long text is split into passages automatically." },
  { value: "pdf", label: "PDF", hint: "Up to 4 MB, with selectable text. Scanned images are not read." },
  { value: "url", label: "Website", hint: "One public page, such as your shipping or returns page." },
];

export default function CreateKnowledgeSourceForm({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [type, setType] = useState<SourceType>("faq");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved("");
    setIsSubmitting(true);

    const form = new FormData();
    form.set("organizationId", organizationId);
    form.set("type", type);
    form.set("name", name.trim());
    if (type === "faq" || type === "text") form.set("content", content.trim());
    if (type === "url") form.set("url", url.trim());
    const file = fileInput.current?.files?.[0];
    if (type === "pdf" && file) form.set("file", file);

    try {
      const response = await fetch("/api/knowledge", { method: "POST", body: form });
      const result = (await response.json().catch(() => ({}))) as { name?: string; passages?: number; error?: string };
      if (!response.ok) {
        setError(result.error ?? "The knowledge could not be added.");
        if (response.status === 502) router.refresh();
        return;
      }
      setSaved(`"${result.name}" is live, indexed as ${result.passages} ${result.passages === 1 ? "passage" : "passages"}.`);
      setName("");
      setContent("");
      setUrl("");
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch {
      setError("The server could not be reached. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (organizations.length === 0) {
    return (
      <p className="border border-dashed border-rule-strong bg-paper p-5 text-[0.9375rem] text-ink-2">
        Create an organization first. Knowledge always belongs to one organization.
      </p>
    );
  }

  const current = TYPES.find((option) => option.value === type)!;
  const busyLabel = type === "url" ? "Reading the page" : type === "pdf" ? "Reading the PDF" : "Indexing";

  return (
    <form className="space-y-4 border border-rule bg-paper p-5" onSubmit={submit}>
      <h3 className="text-lg font-bold">Add approved knowledge</h3>

      {organizations.length > 1 && (
        <div>
          <label className="field-label" htmlFor="knowledge-source-organization">Organization</label>
          <select id="knowledge-source-organization" className="field mt-1.5" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>
        </div>
      )}

      <fieldset>
        <legend className="field-label">Source</legend>
        <div className="mt-1.5 grid grid-cols-4 border border-rule-strong" role="radiogroup">
          {TYPES.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer border-l border-rule-strong p-2 text-center text-sm font-bold first:border-l-0 has-focus-visible:outline-2 has-focus-visible:outline-signal ${
                type === option.value ? "bg-ink text-white" : "text-ink-2 hover:bg-platform hover:text-ink"
              }`}
            >
              <input type="radio" name="knowledge-type" value={option.value} checked={type === option.value} onChange={() => setType(option.value)} className="sr-only" />
              {option.label}
            </label>
          ))}
        </div>
        <p className="field-hint">{current.hint}</p>
      </fieldset>

      <div>
        <label className="field-label" htmlFor="knowledge-source-name">
          Title {(type === "pdf" || type === "url") && <span className="font-normal text-ink-2">(optional)</span>}
        </label>
        <input
          id="knowledge-source-name"
          className="field mt-1.5"
          placeholder={type === "url" ? "Uses the page title if empty" : type === "pdf" ? "Uses the file name if empty" : "Refund FAQ"}
          required={type === "faq" || type === "text"}
          maxLength={255}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      {(type === "faq" || type === "text") && (
        <div>
          <label className="field-label" htmlFor="knowledge-source-content">{type === "faq" ? "Questions and answers" : "Approved text"}</label>
          <textarea
            id="knowledge-source-content"
            className="field mt-1.5 min-h-44 resize-y"
            placeholder={
              type === "faq"
                ? "Q: How long do refunds take?\nA: Approved refunds reach your account in 5 to 7 business days.\n\nQ: Can I return a sale item?\nA: Yes, within 14 days if unused."
                : "Paste your returns policy, shipping guide, or product care instructions."
            }
            required
            maxLength={100_000}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </div>
      )}

      {type === "pdf" && (
        <div>
          <label className="field-label" htmlFor="knowledge-source-file">PDF file</label>
          <input id="knowledge-source-file" ref={fileInput} className="field mt-1.5 py-2 text-sm" type="file" accept="application/pdf,.pdf" required />
        </div>
      )}

      {type === "url" && (
        <div>
          <label className="field-label" htmlFor="knowledge-source-url">Page link</label>
          <input
            id="knowledge-source-url"
            className="field mt-1.5"
            type="url"
            inputMode="url"
            placeholder="https://yourshop.com/shipping"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>
      )}

      {error && <p className="alert-error" role="alert">{error}</p>}
      {saved && <p className="text-sm font-bold text-go" role="status">{saved}</p>}
      <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting || !organizationId}>
        {isSubmitting ? busyLabel : "Add knowledge"}
      </button>
    </form>
  );
}
