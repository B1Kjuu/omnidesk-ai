"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/browser";

type Props = {
  organizationId: string;
  handle: string;
  origin: string;
  /** null when the widget migration has not been applied yet. */
  domains: string[] | null;
};

const domainPattern = /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** "https://www.Shop.com/contact" -> "www.shop.com"; keeps a leading "*." wildcard. */
function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/[/:?#].*$/, "");
}

export default function WidgetSettings({ organizationId, handle, origin, domains }: Props) {
  const router = useRouter();
  const [color, setColor] = useState("#d0261d");
  const [position, setPosition] = useState<"right" | "left">("right");
  const [label, setLabel] = useState("Help");
  const [copied, setCopied] = useState(false);
  const [domainText, setDomainText] = useState((domains ?? []).join("\n"));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const id = `widget-${organizationId}`;

  const snippet = useMemo(() => {
    const attributes = [`src="${origin}/widget.js"`, `data-desk="${handle}"`];
    if (color.toLowerCase() !== "#d0261d") attributes.push(`data-color="${color}"`);
    if (position === "left") attributes.push(`data-position="left"`);
    if (label.trim() && label.trim() !== "Help") attributes.push(`data-label="${label.trim().replace(/"/g, "")}"`);
    return `<script ${attributes.join(" ")} async></script>`;
  }, [origin, handle, color, position, label]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Select the snippet and copy it manually.");
    }
  }

  async function saveDomains(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const list = [...new Set(domainText.split(/[\s,]+/).map(normalizeDomain).filter(Boolean))];
    const invalid = list.filter((domain) => domain !== "localhost" && !domainPattern.test(domain));
    if (invalid.length > 0) {
      setError(`Not a valid domain: ${invalid.join(", ")}. Use a hostname like shop.example.com or *.example.com.`);
      return;
    }
    if (list.length > 20) {
      setError("Up to 20 domains.");
      return;
    }

    setIsSaving(true);
    // RLS: only owners and admins can change an organization.
    const { error: updateError } = await createClient().from("organizations").update({ widget_domains: list }).eq("id", organizationId);
    setIsSaving(false);
    if (updateError) {
      setError(`The domains could not be saved: ${updateError.message}`);
      return;
    }
    setDomainText(list.join("\n"));
    setNotice(list.length ? `The widget now only loads on: ${list.join(", ")}.` : "The widget now loads on any website.");
    router.refresh();
  }

  return (
    <details className="group mt-4 border-t border-dashed border-rule-strong pt-4">
      <summary className="cursor-pointer text-[0.9375rem] font-bold">Website widget</summary>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-sm/relaxed text-ink-2">
            Paste this before <code className="font-mono text-xs">&lt;/body&gt;</code> on your website. A chat button appears in the corner and opens this desk.
          </p>
          <div className="mt-3 grid grid-cols-[auto_1fr_1fr] items-end gap-3">
            <div>
              <label className="field-label" htmlFor={`${id}-color`}>Colour</label>
              <input id={`${id}-color`} type="color" className="mt-1.5 h-10 w-14 cursor-pointer border border-rule-strong bg-paper p-1" value={color} onChange={(event) => setColor(event.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor={`${id}-position`}>Corner</label>
              <select id={`${id}-position`} className="field mt-1.5" value={position} onChange={(event) => setPosition(event.target.value === "left" ? "left" : "right")}>
                <option value="right">Bottom right</option>
                <option value="left">Bottom left</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor={`${id}-label`}>Button text</label>
              <input id={`${id}-label`} className="field mt-1.5" maxLength={24} value={label} onChange={(event) => setLabel(event.target.value)} />
            </div>
          </div>
          <pre className="mt-3 overflow-x-auto border border-rule bg-board p-3 font-mono text-xs/relaxed whitespace-pre-wrap text-board-ink">{snippet}</pre>
          <div className="mt-2 -ml-2 flex flex-wrap gap-1">
            <button type="button" className="btn btn-quiet py-1.5 text-sm" onClick={copy}>
              <Icon name={copied ? "check" : "copy"} className="size-3.5" />
              {copied ? "Copied" : "Copy snippet"}
            </button>
            <a className="btn btn-quiet py-1.5 text-sm no-underline" href={`/embed/${handle}?accent=${color.slice(1)}`} target="_blank" rel="noopener">
              Preview the panel
              <Icon name="external" className="size-3.5" />
            </a>
          </div>
        </div>

        {domains === null ? (
          <p className="text-sm text-ink-2">Apply the latest database migration to restrict which websites can show the widget.</p>
        ) : (
          <form onSubmit={saveDomains}>
            <label className="field-label" htmlFor={`${id}-domains`}>Allowed websites</label>
            <textarea
              id={`${id}-domains`}
              className="field mt-1.5 min-h-28 font-mono text-sm"
              placeholder={"shop.example.com\n*.example.com"}
              value={domainText}
              onChange={(event) => setDomainText(event.target.value)}
              aria-describedby={`${id}-domains-hint`}
            />
            <p id={`${id}-domains-hint`} className="field-hint">
              One per line. Browsers will refuse to show your chat inside any other site. Leave empty to allow any website.
            </p>
            <button className="btn btn-secondary mt-3" type="submit" disabled={isSaving}>
              {isSaving ? "Saving" : "Save websites"}
            </button>
            {notice && <p className="mt-3 alert-info" role="status">{notice}</p>}
          </form>
        )}
      </div>
      {error && <p className="mt-3 alert-error" role="alert">{error}</p>}
    </details>
  );
}
