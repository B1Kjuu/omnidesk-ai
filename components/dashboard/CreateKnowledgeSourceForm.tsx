"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type Organization = {
  id: string;
  name: string;
};

export default function CreateKnowledgeSourceForm({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("faq");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved("");
    setIsSubmitting(true);

    try {
      const { error: createError } = await createClient().rpc("create_knowledge_source", {
        target_organization_id: organizationId,
        source_name: name.trim(),
        source_type: sourceType,
        source_content: content.trim(),
      });

      if (createError) {
        setError(`The knowledge could not be added: ${createError.message}`);
        return;
      }

      setSaved(`"${name.trim()}" is live. Customers can be answered from it now.`);
      setName("");
      setContent("");
      router.refresh();
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
      <div>
        <label className="field-label" htmlFor="knowledge-source-name">Title</label>
        <input
          id="knowledge-source-name"
          className="field mt-1.5"
          placeholder="Refund FAQ"
          required
          maxLength={255}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="knowledge-source-content">Approved answer</label>
        <textarea
          id="knowledge-source-content"
          className="field mt-1.5 min-h-40 resize-y"
          placeholder="Refunds are available within 30 days of delivery. Approved refunds reach your account in 5 to 7 business days."
          required
          value={content}
          onChange={(event) => setContent(event.target.value)}
          aria-describedby="knowledge-source-hint"
        />
        <p id="knowledge-source-hint" className="field-hint">Write it the way you would answer a customer. Only this text is used.</p>
      </div>
      <div>
        <label className="field-label" htmlFor="knowledge-source-type">Type</label>
        <select id="knowledge-source-type" className="field mt-1.5" value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
          <option value="faq">FAQ</option>
          <option value="text">Text</option>
        </select>
      </div>
      {error && <p className="alert-error" role="alert">{error}</p>}
      {saved && <p className="text-sm font-bold text-go" role="status">{saved}</p>}
      <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting || !organizationId}>
        {isSubmitting ? "Adding" : "Add knowledge"}
      </button>
    </form>
  );
}
