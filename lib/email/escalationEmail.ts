import "server-only";

type EscalationEmailInput = {
  organizationName: string;
  customerName: string;
  customerEmail: string | null;
  question: string;
  askedAt: Date;
  dashboardUrl: string;
  settingsUrl: string;
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);

const font = "'Atkinson Hyperlegible',Arial,Helvetica,sans-serif";

/**
 * The escalation notification. Rendered here, in the repo, so the layout is versioned and reviewed;
 * n8n only forwards `subject`, `html`, and `text` to Gmail.
 * Table layout and inline styles because Gmail and Outlook strip <style> blocks and flexbox.
 */
export function renderEscalationEmail(input: EscalationEmailInput) {
  const asked = input.askedAt.toUTCString().replace(" GMT", " UTC");
  const subject = `Needs a person: ${truncate(input.question.replace(/\s+/g, " "), 70)} (${input.organizationName})`;
  const questionHtml = escapeHtml(input.question).replace(/\n/g, "<br>");
  const replyHref = input.customerEmail
    ? `mailto:${encodeURIComponent(input.customerEmail)}?subject=${encodeURIComponent(`Re: your question to ${input.organizationName}`)}`
    : null;

  const row = (label: string, value: string) => `
              <tr>
                <td style="padding:10px 16px 10px 0;border-top:1px solid #d9dce1;font:700 13px/1.4 ${font};color:#4a515b;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;vertical-align:top;width:110px;">${label}</td>
                <td style="padding:10px 0;border-top:1px solid #d9dce1;font:400 16px/1.5 ${font};color:#15171a;vertical-align:top;">${value}</td>
              </tr>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f2f4;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(truncate(input.question, 140))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f2f4;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #d9dce1;">
          <tr>
            <td style="background:#d0261d;padding:14px 24px;font:700 18px/1 ${font};color:#ffffff;letter-spacing:-.01em;">
              OmniDesk
              <span style="font-weight:400;opacity:.85;"> · ${escapeHtml(input.organizationName)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <span style="display:inline-block;background:#fff6d1;border-left:4px solid #e6b800;padding:4px 10px;font:700 13px/1.4 ${font};color:#15171a;">Needs a person</span>
              <h1 style="margin:16px 0 8px;font:700 26px/1.2 ${font};color:#15171a;letter-spacing:-.02em;">A customer question had no approved answer</h1>
              <p style="margin:0;font:400 16px/1.5 ${font};color:#4a515b;">Nothing in the knowledge approved for ${escapeHtml(input.organizationName)} matched it, so the desk did not guess. A ticket is open and waiting for you.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 4px;">
              <div style="border-left:4px solid #15171a;background:#f1f2f4;padding:14px 16px;font:400 17px/1.55 ${font};color:#15171a;">${questionHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row("Customer", escapeHtml(input.customerName))}${row(
                "Email",
                input.customerEmail
                  ? `<a href="mailto:${escapeHtml(input.customerEmail)}" style="color:#d0261d;">${escapeHtml(input.customerEmail)}</a>`
                  : `<span style="color:#4a515b;">Not given. Reply from the dashboard conversation.</span>`,
              )}${row("Asked", asked)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background:#d0261d;"><a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;padding:12px 20px;font:700 16px/1 ${font};color:#ffffff;text-decoration:none;">Open the ticket</a></td>
                ${replyHref ? `<td style="width:10px;"></td><td style="border:1px solid #15171a;"><a href="${escapeHtml(replyHref)}" style="display:inline-block;padding:11px 19px;font:700 16px/1 ${font};color:#15171a;text-decoration:none;">Reply to customer</a></td>` : ""}
              </tr></table>
              <p style="margin:20px 0 0;font:400 14px/1.5 ${font};color:#4a515b;">Tip: add an FAQ that answers this, and the next customer who asks gets an instant, sourced reply.</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #d9dce1;padding:16px 24px;font:400 13px/1.5 ${font};color:#4a515b;">
              You receive this because you are the notification contact for ${escapeHtml(input.organizationName)}.
              <a href="${escapeHtml(input.settingsUrl)}" style="color:#4a515b;">Change who gets these emails</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `NEEDS A PERSON · ${input.organizationName}`,
    "",
    "A customer question had no approved answer, so the desk did not guess. A ticket is open.",
    "",
    `Question: ${input.question}`,
    `Customer: ${input.customerName}`,
    `Email: ${input.customerEmail ?? "not given"}`,
    `Asked: ${asked}`,
    "",
    `Open the ticket: ${input.dashboardUrl}`,
    `Change who gets these emails: ${input.settingsUrl}`,
  ].join("\n");

  return { subject, html, text };
}
