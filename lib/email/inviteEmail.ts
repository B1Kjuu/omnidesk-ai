import "server-only";

type InviteEmailInput = { organizationName: string; inviterEmail: string; role: string; link: string };

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const font = "'Atkinson Hyperlegible',Arial,Helvetica,sans-serif";
const roleText: Record<string, string> = {
  admin: "an admin: you can answer customers, manage knowledge, and change settings",
  agent: "an agent: you can answer customers and handle escalations",
};

/** Invitation to join an organization's desk. Same layout family as the other OmniDesk emails. */
export function renderInviteEmail(input: InviteEmailInput) {
  const subject = `Join ${input.organizationName} on OmniDesk`;
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f2f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f2f4;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d9dce1;">
        <tr><td style="background:#d0261d;padding:14px 24px;font:700 18px/1 ${font};color:#ffffff;">OmniDesk</td></tr>
        <tr><td style="padding:28px 24px;">
          <h1 style="margin:0 0 8px;font:700 24px/1.25 ${font};color:#15171a;">You are invited to ${escapeHtml(input.organizationName)}</h1>
          <p style="margin:0 0 24px;font:400 16px/1.5 ${font};color:#4a515b;">
            ${escapeHtml(input.inviterEmail)} invited you to join as ${escapeHtml(roleText[input.role] ?? input.role)}.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="background:#d0261d;"><a href="${escapeHtml(input.link)}" style="display:inline-block;padding:12px 20px;font:700 16px/1 ${font};color:#ffffff;text-decoration:none;">Accept the invitation</a></td>
          </tr></table>
          <p style="margin:24px 0 0;font:400 14px/1.5 ${font};color:#4a515b;">
            The link expires in 7 days and only works for this email address. If you were not expecting it, ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = [
    `${input.inviterEmail} invited you to join ${input.organizationName} on OmniDesk as ${roleText[input.role] ?? input.role}.`,
    "",
    `Accept: ${input.link}`,
    "",
    "The link expires in 7 days and only works for this email address.",
  ].join("\n");
  return { subject, html, text };
}
